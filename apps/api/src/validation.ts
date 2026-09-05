const boundedString = (maxLength: number, minLength = 1) => ({
  type: "string" as const,
  minLength,
  maxLength,
});

export const mutationSchemas = {
  register: {
    type: "object",
    additionalProperties: false,
    required: ["handle", "displayName", "password", "locale"],
    properties: {
      handle: boundedString(30, 3),
      displayName: boundedString(50, 2),
      password: boundedString(256, 12),
      locale: { type: "string", enum: ["en", "zh"] },
    },
  },
  login: {
    type: "object",
    additionalProperties: false,
    required: ["handle", "password"],
    properties: {
      handle: boundedString(80),
      password: boundedString(256, 8),
    },
  },
  accountProfile: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      displayName: boundedString(50, 2),
      locale: { type: "string", enum: ["en", "zh"] },
      bio: boundedString(280, 0),
      publicProfileEnabled: { type: "boolean" },
    },
  },
  publicProfileReport: {
    type: "object",
    additionalProperties: false,
    required: ["reason"],
    properties: {
      reason: boundedString(120, 2),
      details: boundedString(500, 0),
    },
  },
  passwordChange: {
    type: "object",
    additionalProperties: false,
    required: ["currentPassword", "newPassword"],
    properties: {
      currentPassword: boundedString(256, 8),
      newPassword: boundedString(256, 12),
    },
  },
  creatorApplication: {
    type: "object",
    additionalProperties: false,
    required: ["category", "bio", "scheduleText", "motivation"],
    properties: {
      category: boundedString(60, 2),
      bio: boundedString(500, 20),
      scheduleText: boundedString(160, 4),
      motivation: boundedString(800, 20),
    },
  },
  creatorApplicationDecision: {
    type: "object",
    additionalProperties: false,
    required: ["decision", "reason"],
    properties: {
      decision: { type: "string", enum: ["approved", "rejected"] },
      reason: boundedString(500, 2),
    },
  },
  creatorOnboardingProfile: {
    type: "object",
    additionalProperties: false,
    required: ["creatorHandle", "displayName", "bio", "primaryLanguage", "timezone"],
    properties: {
      creatorHandle: { type: "string", minLength: 3, maxLength: 30, pattern: "^[a-z0-9_-]+$" },
      displayName: boundedString(50, 2),
      bio: boundedString(500, 20),
      primaryLanguage: boundedString(2, 2),
      timezone: boundedString(80, 3),
    },
  },
  creatorAgreementAcceptance: {
    type: "object",
    additionalProperties: false,
    required: ["agreementVersion", "signerName", "ageConfirmed", "agreementConfirmed"],
    properties: {
      agreementVersion: boundedString(80),
      signerName: boundedString(100, 2),
      ageConfirmed: { type: "boolean", const: true },
      agreementConfirmed: { type: "boolean", const: true },
    },
  },
  studioRoomCreate: {
    type: "object",
    additionalProperties: false,
    required: ["title", "primaryLanguage", "additionalLanguages", "tagIds"],
    properties: {
      title: boundedString(120, 2),
      primaryLanguage: boundedString(2, 2),
      additionalLanguages: { type: "array", maxItems: 2, items: boundedString(2, 2) },
      tagIds: { type: "array", maxItems: 8, items: boundedString(36, 36) },
    },
  },
  studioTagCreate: {
    type: "object",
    additionalProperties: false,
    required: ["name"],
    properties: { name: boundedString(30, 2) },
  },
  report: {
    type: "object",
    additionalProperties: false,
    required: ["reason"],
    properties: {
      reason: boundedString(120),
      details: boundedString(500, 0),
    },
  },
  idempotentPurchase: {
    type: "object",
    additionalProperties: false,
    required: ["idempotencyKey"],
    properties: { idempotencyKey: boundedString(160) },
  },
  giftPurchase: {
    type: "object",
    additionalProperties: false,
    required: ["giftId", "idempotencyKey"],
    properties: {
      giftId: boundedString(80),
      idempotencyKey: boundedString(160),
      quantity: { type: "integer", minimum: 1, maximum: 100 },
      confirmedHighValue: { type: "boolean" },
    },
  },
  testCreditOrder: {
    type: "object",
    additionalProperties: false,
    required: ["amount", "idempotencyKey"],
    properties: {
      amount: { type: "integer", enum: [100, 500, 1000, 5000] },
      idempotencyKey: boundedString(160),
    },
  },
  createRoomAction: {
    type: "object",
    additionalProperties: false,
    required: ["title", "coinCost"],
    properties: {
      title: boundedString(80),
      coinCost: { type: "integer", minimum: 1, maximum: 1_000_000 },
      durationLabel: boundedString(60, 0),
    },
  },
  updateRoomAction: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      title: boundedString(80),
      coinCost: { type: "integer", minimum: 1, maximum: 1_000_000 },
      durationLabel: {
        anyOf: [boundedString(60, 0), { type: "null" as const }],
      },
      isActive: { type: "boolean" },
      displayOrder: { type: "integer", minimum: 0, maximum: 10_000 },
    },
  },
  reportReview: {
    type: "object",
    additionalProperties: false,
    required: ["status"],
    properties: { status: { type: "string", enum: ["reviewed", "dismissed"] } },
  },
} as const;
