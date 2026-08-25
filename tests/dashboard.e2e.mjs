import puppeteer from "puppeteer-core";

const dashboardUrl = process.env.E2E_DASHBOARD_URL ?? "http://localhost:3001";
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!email || !password) {
  throw new Error("E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required");
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  const browserErrors = [];

  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (
      (message.type() === "error" &&
        !text.startsWith("Failed to load resource:")) ||
      /hydration|emotion|did not match/i.test(text)
    ) {
      browserErrors.push(text);
    }
  });

  await page.goto(`${dashboardUrl}/login`, { waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => document.body.innerText.includes("Ticket Operations"),
    { timeout: 15_000 },
  );
  await page.waitForFunction(() => document.body.innerText.includes("Live"), {
    timeout: 10_000,
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("Phase 4 Reporter"),
    { timeout: 10_000 },
  );

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().includes("/status")) {
      setTimeout(() => void request.continue(), 1_200);
      return;
    }
    void request.continue();
  });

  async function clickButton(label) {
    const clicked = await page.evaluate((buttonLabel) => {
      const button = [...document.querySelectorAll("button")].find(
        (candidate) => candidate.textContent?.trim() === buttonLabel,
      );
      button?.click();
      return Boolean(button);
    }, label);
    if (!clicked) throw new Error(`Button not found: ${label}`);
  }

  const resolveStartedAt = Date.now();
  await clickButton("Resolve Ticket");
  await page.waitForFunction(
    () => [...document.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Reopen",
    ),
    { timeout: 700 },
  );
  const optimisticResolveMs = Date.now() - resolveStartedAt;
  await page.waitForFunction(
    () => [...document.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Reopen" && !button.disabled,
    ),
    { timeout: 5_000 },
  );

  await clickButton("Reopen");
  await page.waitForFunction(
    () => [...document.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Resolve Ticket" && !button.disabled,
    ),
    { timeout: 5_000 },
  );

  if (browserErrors.length) {
    throw new Error(`Browser console errors: ${browserErrors.join(" | ")}`);
  }

  console.log(
    JSON.stringify({
      login: "passed",
      websocket: "live",
      optimisticResolveMs,
      reopen: "passed",
      hydrationErrors: 0,
    }),
  );
} finally {
  await browser.close();
}
