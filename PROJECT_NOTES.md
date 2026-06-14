# Ecommerce backend — প্রজেক্ট নোট

এই ডকументে এই রিপোতে এখন পর্যন্ত যে কাজগুলো করা হয়েছে তার সংক্ষিপ্ত বিবরণ আছে। Base path সব API এর জন্য **`/api/v1`**।

---

## সাধারণ আর্কিটেকচার

- **Express** + **MongoDB (Mongoose)**, **`express.json()`**, **`cookie-parser`**
- **JWT**: access token Bearer header এ; **`auth`** ও **`authorize('ADMIN')`** middleware (`src/middlewares/auth.middleware.ts`)
- **Validation**: **Zod** + **`validateRequest`** (`src/middlewares/validateRequest.ts`)
- **Errors**: **`AppError`**, **`globalErrorHandler`** (`src/middlewares/globalErrorHandler.ts`)
- **`req.user`**: JWT থেকে (`src/express.d.ts`)

---

## মডিউল ও রাউট মানচিত্র

| Prefix | বিষয় |
|--------|--------|
| `/api/v1/user` | ইউজার সাইনআপ/লগইন, প্রোফাইল, অ্যাডমিন ইউজার লিস্ট |
| `/api/v1/address` | ইউজারের শিপিং ঠিকানা CRUD |
| `/api/v1/wishlist` | উইশলিস্ট |
| `/api/v1/cart` | কার্ট + চেকআউট প্রিভিউ |
| `/api/v1/media` | ইমেজ আপলোড (R2/S3 স্টাইল), Image মডেল |
| `/api/v1/product` | প্রোডাক্ট (বর্তমানে প্রধানত ক্রিয়েট — অ্যাডমিন) |
| `/api/v1/order` | অনলাইন অর্ডার + **`/admin`** ফোন/POS |
| `/api/v1/coupon` | কুপন (অ্যাডমিন CRUD) |
| `/api/v1/payment` | পেমেন্ট রেকর্ড (COD ইত্যাদি) |
| `/api/v1/brand` | ব্র্যান্ড CRUD |
| `/api/v1/category` | ক্যাটাগরি CRUD + পাবলিক GET |
| `/api/v1/attribute` | অ্যাট্রিবিউট ক্যাটালগ CRUD |
| `/api/v1/variant` | ভ্যারিয়েন্ট (SKU, দাম, স্টক) CRUD |

---

## ইউজার (`/api/v1/user`)

- **`POST /create`** — সাইনআপ (validation Zod)
- **`POST /login`** — লগইন (access JSON এ; পুরোনো ফ্লোতে refresh cookie ছিল — বর্তমান রাউট অনুযায়ী লগইন)
- **`GET /me`** — auth — নিজের প্রোফাইল
- **`GET /`** — auth + **`ADMIN`** — সব ইউজার

রোল: **`USER` | `ADMIN`** (`src/modules/user/user.interface.ts`)

---

## ঠিকানা (`/api/v1/address`)

Auth লাগে সব রুটে।

- **`GET /`** — লিস্ট
- **`POST /`** — তৈরি
- **`PATCH /:id`** — আপডেট (ডিফল্ট ঠিকানা টগল ইত্যাদি সার্ভিসে)
- **`DELETE /:id`** — ডিলিট

ফিল্ডের ধারণা: নাম, ফোন, দেশ, স্টেট, সিট, থানা, লোকাল লোকেশন, **`isDefault`**

---

## উইশলিস্ট (`/api/v1/wishlist`)

Auth।

- **`GET /`**
- **`POST /`** — `productId`
- **`DELETE /:id`** — উইশলিস্ট আইটেম আইডি

ইউজার–প্রোডাক্ট জোড়া ইউনিক।

---

## কার্ট (`/api/v1/cart`)

Auth।

- **`GET /`** — পপুলেটেড কার্ট
- **`POST /items`** — লাইন যোগ (`productId`, optional `variantId`, optional `quantity`, optional **`isSelected`**)
- **`PATCH /items/:lineId`** — **`quantity`** ও/বা **`isSelected`** (অন্তত একটি)
- **`DELETE /items/:lineId`**
- **`POST /checkout-preview`** — শুধু **`isSelected === true`** লাইনের উপর ভিত্তি করে Sab‑total; optional **`couponCode`**, **`currency`** — লাইভ ডিসকাউন্ট ও **`totalAmount`** রিটার্ন

কার্ট লাইনে **`isSelected`** (স্কিমায় ডিফল্ট `true`)। পুরোনো ডকументে ফিল্ড না থাকলে লজিকে নির্বাচিত ধরা হয়।

ভ্যারিয়েন্ট ছাড়া একই লজিক যেমন অর্ডারে — একাধিক অ্যাক্টিভ ভ্যারিয়েন্ট থাকলে **`variantId`** লাগতে পারে।

---

## মিডিয়া (`/api/v1/media`)

Auth। Multer আপলোড। ইমেজ মডেল + R2/S3 ক্লায়েন্ট প্যাটার্ন।

- **`POST /`** — আপলোড
- **`GET /all`**, **`GET /:id`**
- **`PATCH /:id`**, **`DELETE /:id`**

---

## প্রোডাক্ট (`/api/v1/product`)

- **`POST /`** — auth + **`ADMIN`** — প্রোডাক্ট তৈরি  
  মডেলে টাইটেল, slug, ক্যাটাগরি, optional ব্র্যান্ড, ইমেজ refs, অ্যাট্রিবিউট refs, **`status`** (`draft` | `active` | `inactive`)।  
  **দাম প্রোডাক্টে নয়** — **`Variant`** এ।

---

## ব্র্যান্ড (`/api/v1/brand`)

- **`GET /`**, **`GET /:id`** — auth (পড়ার জন্য)
- **`POST /`**, **`PATCH /:id`**, **`DELETE /:id`** — **`ADMIN`**

---

## ক্যাটাগরি (`/api/v1/category`)

- **`GET /`** — পাবলিক
- **`GET /:id`** — পাবলিক (params validated)
- **`POST /create`**, **`PATCH /:id`**, **`DELETE /:id`** — **`ADMIN`**

---

## অ্যাট্রিবিউট (`/api/v1/attribute`)

Auth। লিস্ট/ডিটেইল সব লগড ইউজার; লেখা **`ADMIN`**।

---

## ভ্যারিয়েন্ট (`/api/v1/variant`)

মডেল এক্সপোর্ট নাম **`VariantModel`** (ইন্টারফেইস **`Variant`** এর সাথে ক্ল্যাশ এড়াতে)।

Auth। লিস্ট কোয়েরি validated। CUD **`ADMIN`**।

---

## অর্ডার (`/api/v1/order`)

### ব্যবহারকারী (অনলাইন)

- **`POST /`** — auth — অর্ডার প্লেস  
  বডি: **`items`** (`productId`, `quantity`, optional `variantId`, optional **`unitPriceOverride`** সাধারণত ব্যবহার নয় অনলাইনে), **`addressId`**, **`paymentMethod`**, optional **`couponCode`**, **`currency`**
- **`GET /`** — আমার অর্ডার (যেখানে **`userId`** মিলবে)
- **`GET /:id`** — নির্দিষ্ট অর্ডার

অর্ডার লাইনেঃ catalogue দাম **`catalogUnitPrice`**, চার্জ করা **`unitPrice`**, **`priceOverridden`**, সাবটোটাল ইত্যাদি।

ঠিকানাঃ **`addressId`** দিয়ে ইউজারের সেভ করা অ্যাড্রেস লোড করে **এম্বেড স্ন্যাপশট** সংরক্ষণ।

অর্ডার ফিল্ডের ধারণাঃ **`channel`**, **`deliveryMode`**, **`placedByAdminId`**, **`guestContact`**, **`adminNotes`**, **`paymentMethod`**, **`paymentStatus`**, **`paymentId`**, **`status`** ইত্যাদি।

স্টক ভ্যারিয়েন্ট থেকে অ্যাটমিক ডিক্রিমেন্ট। কুপন ভ্যালিডেশন **স্টক কাটার আগে** চালানো হয়।

সাহায্যকারীঃ **`src/modules/variant/variantCheckout.util.ts`** — ভ্যারিয়েন্ট রেজোলভ (অর্ডার + কার্ট প্রিভিউ)।

### অ্যাডমিন (`/api/v1/order/admin`)

সব রুট। **`auth` + `authorize('ADMIN')`**।

- **`GET /`** — query **`?channel=online|phone|pos`** (optional) — অর্ডার লিস্ট (লিমিট ~২০০)
- **`POST /phone`** — ফোন/কল সেন্টার অর্ডার (`PHN-…` নম্বর)  
  ডেলিভারি **`ship_to_address`** হলে **`addressSnapshot`** বাধ্যতামূলক; **`customerUserId`** অথবা **`guestContact`** (ফোন) লাগে; লাইনে optional **`unitPriceOverride`**
- **`POST /pos`** — দোকানে সরাসরি বিক্রয় (`POS-…`)  
  প্রতিটি লাইনে **`unitPrice`** বাধ্যতামূলক; **`paymentMethod`**: **`pos_cash` | `pos_card`**; **`paymentStatus`**: **`completed`**, অর্ডার **`delivered`**, **`deliveryMode`**: **`shop_pickup`**

---

## কুপন (`/api/v1/coupon`)

সব **`ADMIN`**।

- **`POST /create`**, **`GET /`**, **`GET /:id`**, **`PATCH /:id`**, **`DELETE /:id`**

ধরণঃ fixed / percent, **`currency`**, **`minOrderAmount`**, **`maxDiscountAmount`** (percent ক্যাপ), **`expiresAt`**, **`usageLimit`**, **`isActive`**।

---

## পেমেন্ট (`/api/v1/payment`)

Gateway টাইপ **`cash_on_delivery` | `bkash` | `ssl_commerce` | `stripe` | `payoneer` | `pos_cash` | `pos_card`**।

Auth।

- **`GET /`** — আমার পেমেন্ট লিস্ট
- **`POST /cash-on-delivery`** — standalone COD রেকর্ড (optional **`orderId`**)

অর্ডার তৈরির সময় সাধারণত একটি **`Payment`** ডক **`orderId`** দিয়ে লিঙ্ক হয়।

---

## ডাটাবেস / মাইগ্রেশন টিপস

- পুরোনো **`Order`** ডকументে **`channel`**, লাইনে **`catalogUnitPrice`** ইত্যাদি না থাকলে রিড/সিরিয়ালাইজেশনে সমস্যা হতে পারে — প্রয়োজনে একবার **`updateMany`** বা ম্যানুয়াল মাইগ্রেশন করে ডিফল্ট ভরাট করা ভালো।

---

## টাইপচেক

```bash
pnpm exec tsc --noEmit
```

---

*ফাইলটি চ্যাট/ইটারেশন অনুযায়ী আপডেট করা যাবে।*
