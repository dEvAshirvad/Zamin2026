import type { Schema } from 'mongoose';

/**
 * Shared conventions: timestamps + soft-delete via deletedAt.
 * Queries exclude deleted docs unless `includeDeleted: true` is set on the query.
 */
export function applyBaseSchemaPlugin(schema: Schema): void {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
  });

  if (!schema.get('timestamps')) {
    schema.set('timestamps', true);
  }

  schema.pre(/^find/, function excludeDeleted(this: { getOptions: () => { includeDeleted?: boolean }; where: (q: object) => void }) {
    if (this.getOptions().includeDeleted) {
      return;
    }
    this.where({ deletedAt: null });
  });

  schema.methods.softDelete = function softDelete() {
    this.deletedAt = new Date();
    return this.save();
  };
}
