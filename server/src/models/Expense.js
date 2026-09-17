import mongoose from 'mongoose';

/** A gym running cost, recorded against a date so it can be filtered by month. */
const expenseSchema = new mongoose.Schema(
  {
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
