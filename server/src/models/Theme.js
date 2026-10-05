import mongoose from 'mongoose';

export const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * A colour theme a gym can wear.
 *
 * Only the brand colours are stored. The client derives every surface,
 * border and foreground token from them, in both light and dark, so a theme
 * can never be saved in a state that renders unreadable text.
 *
 * System themes ship with the platform (`key` set, `isSystem` true) and are
 * read-only; the platform administrator's own themes have no key.
 */
const themeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    /** Stable identifier for a system theme, so seeds can upsert it. */
    key: { type: String, trim: true, default: null },
    primary: { type: String, required: true, match: HEX_COLOUR, lowercase: true },
    accent: { type: String, match: HEX_COLOUR, lowercase: true, default: null },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// Names are what the platform admin picks from, so two may not look alike.
themeSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
themeSchema.index(
  { key: 1 },
  { unique: true, partialFilterExpression: { key: { $type: 'string' } } },
);

themeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Theme = mongoose.models.Theme ?? mongoose.model('Theme', themeSchema);
