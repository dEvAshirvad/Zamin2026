import { model, models, Schema } from 'mongoose';

export interface TehsilDoc {
  name: string;
  matchKey: string;
  slug: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const tehsilSchema = new Schema<TehsilDoc>(
  {
    name: { type: String, required: true, trim: true },
    matchKey: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
  },
  { collection: 'tehsils' },
);

export const TehsilModel = models.Tehsil ?? model<TehsilDoc>('Tehsil', tehsilSchema);
