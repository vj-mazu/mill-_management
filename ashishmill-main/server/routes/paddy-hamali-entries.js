const express = require('express');
const { Op } = require('sequelize');  // ✅ Added: Import Op for query operators
const { auth, authorize } = require('../middleware/auth');
const PaddyHamaliEntry = require('../models/PaddyHamaliEntry');
const Arrival = require('../models/Arrival');
const User = require('../models/User');
const Outturn = require('../models/Outturn');

const router = express.Router();

// CREATE bulk paddy hamali entries
router.post('/bulk', auth, async (req, res) => {
  const { sequelize } = require('../config/database');
  
  try {
    const { arrivalId, entries } = req.body;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;
    
    // Validate input
    if (!arrivalId) {
      return res.status(400).json({ error: 'Arrival ID is required' });
    }
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one hamali type must be selected' });
    }
    
    // Check if arrival exists
    const arrival = await Arrival.findByPk(arrivalId);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }
    
    // Validate mutual exclusion for restricted types
    const restrictedTypes = ['Paddy Unloading', 'Paddy Shifting', 'Per Lorry'];
    const selectedRestrictedTypes = entries
      .map(e => e.workType)
      .filter(type => restrictedTypes.includes(type));
    
    if (selectedRestrictedTypes.length > 1) {
      return res.status(400).json({ 
        error: 'Only one of Paddy Unloading, Paddy Shifting, or Per Lorry can be selected' 
      });
    }
    
    // Validate each entry
    for (const entry of entries) {
      if (!entry.workType || !entry.workDetail || !entry.rate || !entry.bags) {
        return res.status(400).json({ error: 'All fields are required for each entry' });
      }
      
      if (entry.bags < 1) {
        return res.status(400).json({ error: 'Bags must be at least 1 for each entry' });
      }
    }
    
    // Determine status based on user role
    const status = (userRole === 'manager' || userRole === 'admin') ? 'approved' : 'pending';
    const approvedBy = (status === 'approved') ? userId : null;
    const approvedAt = (status === 'approved') ? new Date() : null;
    
    // Create entries in transaction
    const transaction = await sequelize.transaction();
    
    try {
      const createdEntries = [];
      
      for (const entry of entries) {
        // Calculate amount
        const amount = parseFloat(entry.rate) * parseInt(entry.bags);
        
        // Create entry
        const hamaliEntry = await PaddyHamaliEntry.create({
          arrivalId,
          workType: entry.workType,
          workDetail: entry.workDetail,
          rate: entry.rate,
          bags: entry.bags,
          amount,
          status,
          addedBy: userId,
          approvedBy,
          approvedAt
        }, { transaction });
        
        createdEntries.push(hamaliEntry);
      }
      
      await transaction.commit();
      
      res.status(201).json({
        message: 'Hamali entries created successfully',
        entries: createdEntries,
        autoApproved: status === 'approved'
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Create bulk hamali entries error:', error);
    res.status(500).json({ 
      error: 'Failed to create hamali entries',
      details: error.message 
    });
  }
});

// CREATE paddy hamali entry (single)
router.post('/', auth, async (req, res) => {
  try {
    const { arrivalId, workType, workDetail, rate, bags } = req.body;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;
    
    // Validate input
    if (!arrivalId || !workType || !workDetail || !rate || !bags) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (bags < 1) {
      return res.status(400).json({ error: 'Bags must be at least 1' });
    }
    
    // Check if arrival exists
    const arrival = await Arrival.findByPk(arrivalId);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }
    
    // Calculate amount
    const amount = parseFloat(rate) * parseInt(bags);
    
    // Determine status based on user role
    const status = (userRole === 'manager' || userRole === 'admin') ? 'approved' : 'pending';
    const approvedBy = (status === 'approved') ? userId : null;
    const approvedAt = (status === 'approved') ? new Date() : null;
    
    // Create entry
    const entry = await PaddyHamaliEntry.create({
      arrivalId,
      workType,
      workDetail,
      rate,
      bags,
      amount,
      status,
      addedBy: userId,
      approvedBy,
      approvedAt
    });
    
    res.status(201).json({ 
      message: 'Hamali entry created successfully', 
      entry,
      autoApproved: status === 'approved'
    });
  } catch (error) {
    console.error('Create paddy hamali entry error:', error);
    res.status(500).json({ error: 'Failed to create hamali entry' });
  }
});

// GET hamali entries for an arrival
router.get('/arrival/:arrivalId', auth, async (req, res) => {
  try {
    const { arrivalId } = req.params;
    
    const entries = await PaddyHamaliEntry.findAll({
      where: { arrivalId },
      include: [
        { model: User, as: 'addedByUser', attributes: ['id', 'username', 'role'] },
        { model: User, as: 'approvedByUser', attributes: ['id', 'username', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    const total = entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    
    res.json({ entries, total });
  } catch (error) {
    console.error('Get hamali entries error:', error);
    res.status(500).json({ error: 'Failed to fetch hamali entries' });
  }
});

// UPDATE hamali entry
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { workType, workDetail, rate, bags } = req.body;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;
    
    const entry = await PaddyHamaliEntry.findByPk(id);
    
    if (!entry) {
      return res.status(404).json({ error: 'Hamali entry not found' });
    }
    
    // Check permissions
    if (entry.status === 'approved' && userRole === 'staff') {
      return res.status(403).json({ error: 'Cannot edit approved hamali entry' });
    }
    
    if (entry.status === 'pending' && entry.addedBy !== userId && userRole === 'staff') {
      return res.status(403).json({ error: 'You can only edit your own entries' });
    }
    
    // Update entry
    entry.workType = workType;
    entry.workDetail = workDetail;
    entry.rate = rate;
    entry.bags = bags;
    entry.amount = parseFloat(rate) * parseInt(bags);
    
    await entry.save();
    
    res.json({ message: 'Hamali entry updated successfully', entry });
  } catch (error) {
    console.error('Update hamali entry error:', error);
    res.status(500).json({ error: 'Failed to update hamali entry' });
  }
});

// APPROVE hamali entry
router.put('/:id/approve', auth, authorize(['manager', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    
    const entry = await PaddyHamaliEntry.findByPk(id);
    
    if (!entry) {
      return res.status(404).json({ error: 'Hamali entry not found' });
    }
    
    if (entry.status === 'approved') {
      return res.status(400).json({ error: 'Entry is already approved' });
    }
    
    entry.status = 'approved';
    entry.approvedBy = userId;
    entry.approvedAt = new Date();
    
    await entry.save();
    
    res.json({ message: 'Hamali entry approved successfully', entry });
  } catch (error) {
    console.error('Approve hamali entry error:', error);
    res.status(500).json({ error: 'Failed to approve hamali entry' });
  }
});

// GET hamali book (approved entries only)  
// Note: Authorization temporarily disabled - all authenticated users can access
router.get('/book', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo, workType } = req.query;
    
    console.log('📖 Hamali Book Request:', { 
      dateFrom, 
      dateTo, 
      workType,
      user: req.user,
      userId: req.user?.userId,
      userRole: req.user?.role
    });
    
    const where = { status: 'approved' };
    
    // Apply work type filter
    if (workType) {
      where.workType = workType;
    }
    
    // Build include array
    const include = [
      { 
        model: Arrival, 
        as: 'arrival',
        attributes: ['id', 'slNo', 'broker', 'date', 'bags', 'variety', 'movementType'],
        include: [
          {
            model: Outturn,
            as: 'outturn',
            attributes: ['code'],
            required: false
          },
          {
            model: require('../models/Location').Kunchinittu,
            as: 'toKunchinittu',
            attributes: ['name', 'code'],
            include: [
              {
                model: require('../models/Location').Warehouse,
                as: 'warehouse',
                attributes: ['name'],
                required: false
              }
            ],
            required: false
          },
          {
            model: require('../models/Location').Warehouse,
            as: 'toWarehouse',
            attributes: ['name', 'code'],
            required: false
          },
          {
            model: require('../models/Location').Kunchinittu,
            as: 'fromKunchinittu',
            attributes: ['name', 'code'],
            include: [
              {
                model: require('../models/Location').Warehouse,
                as: 'warehouse',
                attributes: ['name'],
                required: false
              }
            ],
            required: false
          },
          {
            model: require('../models/Location').Warehouse,
            as: 'fromWarehouse',
            attributes: ['name', 'code'],
            required: false
          },
          {
            model: require('../models/Location').Warehouse,
            as: 'toWarehouseShift',
            attributes: ['name', 'code'],
            required: false
          }
        ],
        required: false  // LEFT JOIN - include entries even without arrival
      },
      { 
        model: User, 
        as: 'addedByUser', 
        attributes: ['id', 'username'],
        required: false
      },
      { 
        model: User, 
        as: 'approvedByUser', 
        attributes: ['id', 'username'],
        required: false
      }
    ];
    
    // Apply date filters on arrival date if provided
    if (dateFrom || dateTo) {
      const dateWhere = {};
      if (dateFrom) {
        dateWhere[Op.gte] = dateFrom;
      }
      if (dateTo) {
        dateWhere[Op.lte] = dateTo;
      }
      include[0].where = { date: dateWhere };
      include[0].required = true;  // INNER JOIN when filtering by date
    }
    
    const entries = await PaddyHamaliEntry.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`✅ Found ${entries.length} hamali entries`);
    
    const total = entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    
    res.json({ entries, total });
  } catch (error) {
    console.error('❌ Get hamali book error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch hamali book', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// DELETE hamali entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;
    
    const entry = await PaddyHamaliEntry.findByPk(id);
    
    if (!entry) {
      return res.status(404).json({ error: 'Hamali entry not found' });
    }
    
    // Only creator can delete pending entries, manager/admin can delete any
    if (entry.status === 'pending' && entry.addedBy !== userId && userRole === 'staff') {
      return res.status(403).json({ error: 'You can only delete your own entries' });
    }
    
    if (entry.status === 'approved' && userRole === 'staff') {
      return res.status(403).json({ error: 'Cannot delete approved hamali entry' });
    }
    
    await entry.destroy();
    
    res.json({ message: 'Hamali entry deleted successfully' });
  } catch (error) {
    console.error('Delete hamali entry error:', error);
    res.status(500).json({ error: 'Failed to delete hamali entry' });
  }
});

module.exports = router;
