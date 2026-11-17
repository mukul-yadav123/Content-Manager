import mongoose from 'mongoose';

const carouselSlideSchema = new mongoose.Schema({
  slideNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  imageUrl: { type: String }
});

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    hook: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true
    },
    cta: {
      type: String,
      trim: true
    },
    hashtags: {
      type: [String],
      default: []
    },
    mediaType: {
      type: String,
      enum: ['none', 'single-image', 'carousel'],
      default: 'none'
    },
    mediaUrl: {
      type: String
    },
    carouselSlides: {
      type: [carouselSlideSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['draft', 'reviewing', 'ready', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    researchSources: [
      {
        title: String,
        url: String,
        snippet: String
      }
    ]
  },
  {
    timestamps: true
  }
);

export const Post = mongoose.model('Post', postSchema);
export default Post;

