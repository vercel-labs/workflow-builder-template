import { expect, test } from "@playwright/test";

const SELECTED_CLASS_REGEX = /selected/;

test.describe("Workflow Editor", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage which has an embedded workflow canvas
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for the canvas to be ready
    await page.waitForSelector('[data-testid="workflow-canvas"]', {
      state: "visible",
      timeout: 60_000,
    });
  });

  test("workflow canvas loads", async ({ page }) => {
    // Verify the canvas container is visible
    const canvas = page.locator('[data-testid="workflow-canvas"]');
    await expect(canvas).toBeVisible();

    // Verify React Flow is rendered
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible();
  });

  test("can create a new step by dragging from a node", async ({ page }) => {
    // Wait for any existing nodes to be visible
    await page.waitForTimeout(1000);

    // Find the trigger node's source handle
    const triggerHandle = page.locator(
      ".react-flow__node-trigger .react-flow__handle-source"
    );

    // If there's a trigger node, drag from it to create a new node
    if (await triggerHandle.isVisible()) {
      const handleBox = await triggerHandle.boundingBox();
      if (handleBox) {
        // Start drag from handle
        await page.mouse.move(
          handleBox.x + handleBox.width / 2,
          handleBox.y + handleBox.height / 2
        );
        await page.mouse.down();

        // Drag to empty area
        await page.mouse.move(handleBox.x + 300, handleBox.y);
        await page.mouse.up();

        // Wait for the new node to appear
        await page.waitForTimeout(500);

        // Verify a new action node was created (checking for action grid in properties)
        const actionGrid = page.locator('[data-testid="action-grid"]');
        await expect(actionGrid).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("search input is auto-focused when creating a new step", async ({
    page,
  }) => {
    // Wait for any existing nodes
    await page.waitForTimeout(1000);

    // Find the trigger node's source handle
    const triggerHandle = page.locator(
      ".react-flow__node-trigger .react-flow__handle-source"
    );

    if (await triggerHandle.isVisible()) {
      const handleBox = await triggerHandle.boundingBox();
      if (handleBox) {
        // Drag from handle to create new node
        await page.mouse.move(
          handleBox.x + handleBox.width / 2,
          handleBox.y + handleBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 300, handleBox.y);
        await page.mouse.up();

        // Wait for new node and action grid
        await page.waitForTimeout(500);

        // Verify the search input is focused
        const searchInput = page.locator('[data-testid="action-search-input"]');
        await expect(searchInput).toBeFocused({ timeout: 5000 });
      }
    }
  });

  test("search input is NOT auto-focused when selecting existing unconfigured step", async ({
    page,
  }) => {
    // First create a new step
    const triggerHandle = page.locator(
      ".react-flow__node-trigger .react-flow__handle-source"
    );

    if (await triggerHandle.isVisible()) {
      const handleBox = await triggerHandle.boundingBox();
      if (handleBox) {
        // Create new node
        await page.mouse.move(
          handleBox.x + handleBox.width / 2,
          handleBox.y + handleBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 300, handleBox.y);
        await page.mouse.up();

        await page.waitForTimeout(500);

        // Click on canvas to deselect
        const canvas = page.locator('[data-testid="workflow-canvas"]');
        const canvasBox = await canvas.boundingBox();
        if (canvasBox) {
          // Click on empty area of canvas
          await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
          await page.waitForTimeout(300);
        }

        // Find the action node and click on it
        const actionNode = page.locator(".react-flow__node-action").first();
        if (await actionNode.isVisible()) {
          await actionNode.click();
          await page.waitForTimeout(300);

          // Verify search input is visible but NOT focused
          const searchInput = page.locator(
            '[data-testid="action-search-input"]'
          );
          await expect(searchInput).toBeVisible({ timeout: 5000 });

          // The search input should NOT be focused when re-selecting an existing node
          await expect(searchInput).not.toBeFocused();
        }
      }
    }
  });

  test("can select and deselect nodes", async ({ page }) => {
    // Wait for nodes to be visible
    await page.waitForTimeout(1000);

    // Find trigger node
    const triggerNode = page.locator(".react-flow__node-trigger").first();

    if (await triggerNode.isVisible()) {
      // Click to select
      await triggerNode.click();
      await page.waitForTimeout(300);

      // Verify node is selected (has border-primary class or selected attribute)
      await expect(triggerNode).toHaveClass(SELECTED_CLASS_REGEX);

      // Click on canvas to deselect
      const canvas = page.locator('[data-testid="workflow-canvas"]');
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
        await page.waitForTimeout(300);
      }

      // Verify node is deselected
      await expect(triggerNode).not.toHaveClass(SELECTED_CLASS_REGEX);
    }
  });

  test("can select an action type for a new step", async ({ page }) => {
    // First create a new step
    const triggerHandle = page.locator(
      ".react-flow__node-trigger .react-flow__handle-source"
    );

    if (await triggerHandle.isVisible()) {
      const handleBox = await triggerHandle.boundingBox();
      if (handleBox) {
        // Create new node
        await page.mouse.move(
          handleBox.x + handleBox.width / 2,
          handleBox.y + handleBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 300, handleBox.y);
        await page.mouse.up();

        await page.waitForTimeout(500);

        // Wait for action grid to appear
        const actionGrid = page.locator('[data-testid="action-grid"]');
        await expect(actionGrid).toBeVisible({ timeout: 5000 });

        // Click on HTTP Request action
        const httpRequestAction = page.locator(
          '[data-testid="action-option-http-request"]'
        );
        await expect(httpRequestAction).toBeVisible();
        await httpRequestAction.click();

        // Wait for the action to be selected
        await page.waitForTimeout(500);

        // Verify the action grid is no longer visible (node is now configured)
        await expect(actionGrid).not.toBeVisible({ timeout: 5000 });

        // Verify the node now shows the HTTP Request configuration
        // The action node should no longer show the action selection grid
        const selectedActionNode = page.locator(".react-flow__node-action");
        await expect(selectedActionNode).toBeVisible();
      }
    }
  });

  test("search filters actions in the action grid", async ({ page }) => {
    // First create a new step
    const triggerHandle = page.locator(
      ".react-flow__node-trigger .react-flow__handle-source"
    );

    if (await triggerHandle.isVisible()) {
      const handleBox = await triggerHandle.boundingBox();
      if (handleBox) {
        // Create new node
        await page.mouse.move(
          handleBox.x + handleBox.width / 2,
          handleBox.y + handleBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 300, handleBox.y);
        await page.mouse.up();

        await page.waitForTimeout(500);

        // Wait for search input
        const searchInput = page.locator('[data-testid="action-search-input"]');
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        // Type in search
        await searchInput.fill("HTTP");
        await page.waitForTimeout(300);

        // Verify HTTP Request is visible
        const httpRequestAction = page.locator(
          '[data-testid="action-option-http-request"]'
        );
        await expect(httpRequestAction).toBeVisible();

        // Verify non-matching actions are filtered out
        const conditionAction = page.locator(
          '[data-testid="action-option-condition"]'
        );
        await expect(conditionAction).not.toBeVisible();
      }
    }
  });
});
