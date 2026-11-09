import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
  createDemoAuthenticator,
  createDemoProfiles,
  createDemoServices,
} from "../../src/demo/environment.js";
import { unusedContentService, unusedGovernanceService } from "./content-fixture.js";

function createDemoApp() {
  return createApp(
    {
      authenticator: createDemoAuthenticator(),
      profiles: createDemoProfiles(),
      ...createDemoServices(),
    },
    { demoMode: true },
  );
}

describe("synthetic demo environment", () => {
  it("allows demo role selection only when demo mode is enabled", async () => {
    const disabledApp = createApp(
      {
        authenticator: createDemoAuthenticator(),
        profiles: createDemoProfiles(),
        requests: createDemoServices().requests,
        content: unusedContentService(),
        governance: unusedGovernanceService(),
      },
    );
    await request(disabledApp)
      .post("/api/v1/auth/demo/start")
      .send({ role: "platform_admin" })
      .expect(404);

    await request(createDemoApp())
      .post("/api/v1/auth/demo/start")
      .send({ role: "unknown" })
      .expect(400);
  });

  it("supports employee submission and manager updates using synthetic data only", async () => {
    const app = createDemoApp();
    const employeeSignIn = await request(app)
      .post("/api/v1/auth/demo/start")
      .send({ role: "employee" })
      .expect(200);
    expect(employeeSignIn.headers["x-demo-mode"]).toBe("true");

    const employeeAuth = `Bearer ${employeeSignIn.body.accessToken as string}`;
    const options = await request(app)
      .get("/api/v1/requests/options")
      .set("Authorization", employeeAuth)
      .expect(200);
    expect(options.body.categories[0].name).toBe("IT support");

    const created = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", employeeAuth)
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000910")
      .send({
        categoryId: "00000000-0000-4000-8000-000000000301",
        departmentId: "00000000-0000-4000-8000-000000000101",
        summary: "Demo projector is unavailable",
        description: "The synthetic meeting-room projector does not start.",
      })
      .expect(201);
    expect(created.body.reference).toMatch(/^JU-/);

    const managerSignIn = await request(app)
      .post("/api/v1/auth/demo/start")
      .send({ role: "department_manager" })
      .expect(200);
    const managerAuth = `Bearer ${managerSignIn.body.accessToken as string}`;
    const updated = await request(app)
      .patch("/api/v1/requests/00000000-0000-4000-8000-000000000401/status")
      .set("Authorization", managerAuth)
      .send({ status: "acknowledged" })
      .expect(200);
    expect(updated.body.status).toBe("acknowledged");

    for (let flagNumber = 0; flagNumber < 3; flagNumber += 1) {
      const response = await request(app)
        .post("/api/v1/requests/00000000-0000-4000-8000-000000000401/flags")
        .set("Authorization", employeeAuth)
        .send({})
        .expect(200);
      expect(response.body.reviewTriggered).toBe(flagNumber === 2);
    }

    await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", managerAuth)
      .expect(200)
      .then((response) => expect(response.body.unreadCount).toBe(1));

    const leadershipSignIn = await request(app)
      .post("/api/v1/auth/demo/start")
      .send({ role: "senior_leadership" })
      .expect(200);
    await request(app)
      .get("/api/v1/notifications")
      .set(
        "Authorization",
        `Bearer ${leadershipSignIn.body.accessToken as string}`,
      )
      .expect(200)
      .then((response) => expect(response.body.unreadCount).toBe(1));

    const adminSignIn = await request(app)
      .post("/api/v1/auth/demo/start")
      .send({ role: "platform_admin" })
      .expect(200);
    const audit = await request(app)
      .get("/api/v1/audit-events")
      .set("Authorization", `Bearer ${adminSignIn.body.accessToken as string}`)
      .expect(200);
    expect(audit.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "requests.escalated" }),
      ]),
    );

    const health = await request(app).get("/api/v1/health").expect(200);
    expect(health.body).toEqual({ status: "ok", demoMode: true });
  });
});
