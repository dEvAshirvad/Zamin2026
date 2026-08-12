export const queryKeys = {
  health: ['health'] as const,
  session: ['session'] as const,
  staff: ['staff'] as const,
  cases: ['cases'] as const,
  case: (id: string) => ['cases', id] as const,
};
