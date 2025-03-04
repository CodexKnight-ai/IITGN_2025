import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  documentId: {
    type: String,
    required: true,
    unique: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  editorAccess: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reviewerAccess: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readerAccess: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  title: {
    type: String,
    default: 'Untitled Document'
  },
  content: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  templateId: {
    type: String,
    ref: 'Template'
  },
  metadata: {
    type: Object,
    default: {}
  }
});

const Document = mongoose.model('Document', documentSchema);

export default Document; 