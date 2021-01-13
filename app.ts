import { Application, Router, send } from "https://deno.land/x//oak/mod.ts";
import { Product } from "./product.ts";
import { Cart } from "./cart.ts";
const { cwd, stdout, copy } = Deno;
import * as dejs from "https://deno.land/x/dejs@0.9.3/mod.ts";
import { renderFile } from "https://deno.l87and/x/dejs/mod.ts";
import { Session } from "https://deno.land/x/session@1.1.0/mod.ts";

const products: Product[] = new Array<Product>();

const data = Deno.readTextFile("./assets/data/products.json");

const session = new Session({ framework: "oak" });
await session.init();

data.then((response) => {
  return JSON.parse(response);
}).then((jsonData) => {
  for (const element of jsonData) {
    products.push(element);
  }
});

const router = new Router();
router
  .get("/", async (context) => {
    context.response.body = await renderFile(
      `${cwd()}/views/index.ejs`,
      { products },
    );
  })

  // Products

  .get("/product/:id", async (context) => {
    if (
      context.params && context.params.id &&
      products.find((product) => product.id == context.params.id)
    ) {
      const product = products.find((product) =>
        product.id == context.params.id
      );
      context.response.body = await renderFile(`${cwd()}/views/details.ejs`, { product });
    }
  })


  // Cart

  .get("/cart", async (context) => {
    let cart = await context.state.session.get("cart");

    if (cart == undefined) {
      context.response.body = await renderFile(`${cwd()}/views/cart.ejs`, { name: "Cart", cart })
    } else {
      context.response.body = await renderFile(`${cwd()}/views/cart.ejs`, { name: "Cart", cart });
    }
  })
  .get("/cart/total", async (context) => {
    let crt = await context.state.session.get("cart");
    if (crt == undefined) {
      context.response.body = "0.00";
    } else {
      
      let total = 0;
      let pro: Product[];
      crt.forEach((product: Cart) => {
        let subTotal = product.unitPrice * product.amount;
        total += subTotal;
      });
      
      context.response.body = total;
    }
  })
  .post("/cart/add/:id", async (context) => {
    let shoppingCart = new Array<Cart>();
    if (await context.state.session.get("cart") == undefined) {
      await context.state.session.set("cart", shoppingCart);
    }

    let shoppingCart1 = await context.state.session.get("cart");
    const product = products.find(x => Number(x.id) === Number(context.params.id));

    if (product == undefined) {
      context.response.body = "Error trying to add product";
    } else {
      let proInCart = shoppingCart1.find((x: Cart) => Number(x.id) === Number(context.params.id));
      if (proInCart != undefined) {
        proInCart.amount++;
        proInCart.total = proInCart.unitPrice * proInCart.amount;
      } else {

        let crt: Cart = {
          id: product.id,
          productName: product.productName,
          unitPrice: product.specialOffer,
          amount: 1,
          total: product.specialOffer
        };
        await context.state.session.set("cart", [...shoppingCart1, crt]);

      }

      let shoppingCart2 = await context.state.session.get("cart");
      context.response.body = shoppingCart2;
    }
  })
  .post("/cart/remove/:id", async (context) => {
    let cart12 = await context.state.session.get("cart");

    let proInCart = cart12.find((x: Cart) => Number(x.id) === Number(context.params.id));


    if(proInCart.amount == 1) {
      cart12 = cart12.filter((t:Cart) => t.id != context.params.id);
    } else {
      proInCart.amount--;
      proInCart.total = proInCart.unitPrice * proInCart.amount;
    }

    let newCart = await context.state.session.get("cart");
    await context.state.session.set("cart", cart12);
    console.log(cart12);
    context.response.body = cart12;
  })



  // Checkout

  .get("/checkout", async (context) => {
    context.response.body = await renderFile(`${cwd()}/views/checkout.ejs`, { name: "Checkout" });
  })
  .post("/checkout", async (context) => {
    context.state.session.set("cart", undefined);

    context.response.body = "You have successfully checked out";
  })

const app = new Application();

app.use(session.use()(session));
app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (context) => {
  await send(context, context.request.url.pathname, {
    root: `${Deno.cwd()}/assets`
  });
});

await app.listen({ port: 8000 });
