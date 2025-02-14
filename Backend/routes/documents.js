import express from 'express';
import Document from '../models/Document.js';
import UserFiles from '../models/UserFiles.js';
import { nanoid } from 'nanoid';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Create new document
router.post('/create', auth, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const documentId = nanoid(16);
    const document = new Document({
      documentId,
      author: req.user._id,
      title: 'Untitled Document',
      content: '',
      editorAccess: [],
      reviewerAccess: [],
      readerAccess: []
    });
    
    const savedDoc = await document.save();

    // Update or create UserFiles document
    await UserFiles.findOneAndUpdate(
      { userId: req.user._id },
      { 
        $push: { filesCreated: savedDoc._id },
        $setOnInsert: { userId: req.user._id }
      },
      { upsert: true, new: true }
    );
    
    res.status(201).json({ 
      documentId: savedDoc.documentId,
      message: 'Document created successfully' 
    });
  } catch (error) {
    console.error('Document creation error:', error);
    res.status(500).json({ 
      message: 'Error creating document',
      error: error.message 
    });
  }
});

// Get recent documents
router.get('/recent', auth, async (req, res) => {
  try {
    const userFiles = await UserFiles.findOne({ userId: req.user._id })
      .populate({
        path: 'filesCreated',
        options: { sort: { 'lastModified': -1 } },
        limit: 10
      });

    if (!userFiles) {
      return res.json({ documents: [] });
    }

    const documents = userFiles.filesCreated.map(doc => ({
      _id: doc._id,
      documentId: doc.documentId,
      title: doc.title,
      createdAt: doc.createdAt,
      updatedAt: doc.lastModified
    }));

    res.json({ documents });
  } catch (error) {
    console.error('Error fetching recent documents:', error);
    res.status(500).json({ message: 'Error fetching recent documents' });
  }
});

// Get shared documents
router.get('/shared', auth, async (req, res) => {
  try {
    const userFiles = await UserFiles.findOne({ userId: req.user._id })
      .populate({
        path: 'filesShared',
        options: { sort: { 'lastModified': -1 } },
        limit: 10,
        populate: {
          path: 'author',
          select: 'name email'
        }
      });

    if (!userFiles) {
      return res.json({ documents: [] });
    }

    const documents = userFiles.filesShared || [];
    res.json({ documents });
    
  } catch (error) {
    console.error('Error fetching shared documents:', error);
    res.status(500).json({ message: 'Error fetching shared documents' });
  }
});

// Get document by documentId
router.get('/:documentId', auth, async (req, res) => {
  try {
    const document = await Document.findOne({ 
      documentId: req.params.documentId 
    }).populate('author', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Convert document to a plain object to modify it
    const docObject = document.toObject();
    
    // Add author's _id to the response
    docObject.author = document.author?._id || document.author;

    res.json(docObject);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Error fetching document' });
  }
});

// Update document by documentId
router.put('/:documentId', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const document = await Document.findOneAndUpdate(
      { documentId: req.params.documentId },
      { 
        $set: { 
          title, 
          content,
          lastModified: new Date()
        } 
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Error updating document' });
  }
});

// Share document
router.post('/:documentId/share', auth, async (req, res) => {
  try {
    const { email, accessLevel } = req.body;
    
    // Find the document
    const document = await Document.findOne({ documentId: req.params.documentId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is the author
    if (document.author.toString() !== req.user._id) {
      return res.status(403).json({ message: 'Only the author can share this document' });
    }

    // Find the user to share with
    const userToShare = await User.findOne({ email });
    if (!userToShare) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has access
    const hasEditorAccess = document.editorAccess.includes(userToShare._id);
    const hasReviewerAccess = document.reviewerAccess.includes(userToShare._id);
    const hasReaderAccess = document.readerAccess.includes(userToShare._id);

    // Remove user from all access arrays
    document.editorAccess = document.editorAccess.filter(id => id.toString() !== userToShare._id.toString());
    document.reviewerAccess = document.reviewerAccess.filter(id => id.toString() !== userToShare._id.toString());
    document.readerAccess = document.readerAccess.filter(id => id.toString() !== userToShare._id.toString());

    // Add user to appropriate access array
    switch (accessLevel) {
      case 'editor':
        document.editorAccess.push(userToShare._id);
        break;
      case 'reviewer':
        document.reviewerAccess.push(userToShare._id);
        break;
      case 'reader':
        document.readerAccess.push(userToShare._id);
        break;
      default:
        return res.status(400).json({ message: 'Invalid access level' });
    }

    // Save the document
    await document.save();

    // Update UserFiles for the shared user
    let userFiles = await UserFiles.findOne({ userId: userToShare._id });
    
    if (!userFiles) {
      userFiles = new UserFiles({ userId: userToShare._id });
    }

    if (!userFiles.filesShared.includes(document._id)) {
      userFiles.filesShared.push(document._id);
      await userFiles.save();
    }

    res.json({ 
      message: `Document shared with ${email} as ${accessLevel}`,
      document
    });

  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({ 
      message: 'Error sharing document',
      error: error.message 
    });
  }
});

export default router; 