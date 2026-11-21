export const PAY_THROTTLE = {
  default: {
    ttl: () => Number(process.env.THROTTLE_PAY_TTL) * 1000,
    limit: () => Number(process.env.THROTTLE_PAY_LIMIT),
  },
};
