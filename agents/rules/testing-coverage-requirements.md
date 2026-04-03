---
title: Maintain 80%+ Test Coverage for New Code
impact: HIGH
tags: testing, coverage, quality
---

## Maintain 80%+ Test Coverage for New Code

**Impact: HIGH**

Every PR must have near-80%+ test coverage for the code it introduces or modifies. If you add 50 lines of new code, those lines must be covered by tests.

**Coverage requirements:**
- Overall for new code: 80%+
- Unit tests for pure functions, schemas, utils: near 100%
- AI tool implementations: test `call()`, `validateInput()`, prompt generation
- tRPC routers: test with MSW mocking external calls
- Knowledge base: test ingestion, compilation, retrieval, verification flow

**Incorrect (untested code):**

```typescript
export function calculateRefrigerantCharge(model: string, lineLength: number): ChargeResult {
  // Complex calculation with no tests
}
```

**Correct (comprehensive tests co-located):**

```typescript
// calculateRefrigerantCharge/calculateRefrigerantCharge.test.ts
describe("calculateRefrigerantCharge", () => {
  it("returns correct charge for standard R-410A system", () => {
    const result = calculateRefrigerantCharge("FTXM25", 15);
    expect(result.chargeKg).toBeCloseTo(2.4);
    expect(result.refrigerantType).toBe("R-410A");
  });

  it("throws on unknown model number", () => {
    expect(() => calculateRefrigerantCharge("UNKNOWN", 15)).toThrow();
  });

  it("handles edge case of zero line length", () => {
    const result = calculateRefrigerantCharge("FTXM25", 0);
    expect(result.chargeKg).toBe(result.factoryCharge);
  });
});
```

**Leverage AI for test generation.** AI agents can generate comprehensive test suites quickly. Use it.

**Test co-location:** `session.router.test.ts` lives next to `session.router.ts`. Never scatter tests into a separate `__tests__/` directory.
