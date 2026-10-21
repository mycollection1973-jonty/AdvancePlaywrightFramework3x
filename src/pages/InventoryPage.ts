// 15-10-2026
// created by SnapLocator 

import { type Locator, type Page } from '@playwright/test';

export class Inventorypage {
  readonly page: Page;
  readonly ttacart: Locator;
  readonly itemTestAllthethingsTshirtRed: Locator;
  readonly linkTestAll: Locator;
  readonly shoppingCartContainerSvg: Locator;
  readonly firstAddToCartButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.ttacart = page.getByText("TTACart");
    this.itemTestAllthethingsTshirtRed = page.getByTestId("item-test-allthethings-tshirt-red-title-link").or(page.getByRole("link", { name: "Test.allTheThings() T-Shirt (Red)" })).or(page.getByText("Test.allTheThings() T-Shirt (Red)"));
    this.linkTestAll = page.getByRole("link", { name: "test.all()" }).or(page.getByTestId("item-img-link"));
    this.shoppingCartContainerSvg = page.locator("#shopping_cart_container > svg");
    this.firstAddToCartButton = page.getByRole("button", { name: "Add to cart" }).first();
  }

  async goto() {
    await this.page.goto("https://app.thetestingacademy.com/playwright/ttacart/inventory");
  }
}
