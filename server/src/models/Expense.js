import mongoose from 'mongoose';

/** A gym running cost, recorded against a date so it can be filtered by month. */
const expenseSchema = new mongoose.Schema(
  {
    gym: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be greater than zero'],
    },
  },
  { timestamps: true },
);

// The expenses screen always filters by gym and month, in that order.
expenseSchema.index({ gym: 1, date: -1 });

expenseSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Expense = mongoose.models.Expense ?? mongoose.model('Expense', expenseSchema);
