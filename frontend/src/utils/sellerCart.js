const cartKey = (userId) => `petmatch_seller_cart_${userId}`

export function getSellerCart(userId) {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(cartKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setSellerCart(userId, items) {
  if (!userId) return
  localStorage.setItem(cartKey(userId), JSON.stringify(items))
}

export function addToSellerCart(userId, item, quantity) {
  const cart = getSellerCart(userId)
  const qty = Math.max(1, Number(quantity) || 1)
  const existing = cart.find((c) => c.itemId === item.id)
  if (existing) {
    existing.quantity += qty
  } else {
    cart.push({
      itemId: item.id,
      title: item.title,
      price: Number(item.price) || 0,
      imagePath: item.imagePaths?.[0] || '',
      quantity: qty
    })
  }
  setSellerCart(userId, cart)
  return cart
}

export function removeFromSellerCart(userId, itemId) {
  const cart = getSellerCart(userId).filter((c) => c.itemId !== itemId)
  setSellerCart(userId, cart)
  return cart
}

export function updateSellerCartQty(userId, itemId, quantity) {
  const cart = getSellerCart(userId)
  for (const item of cart) {
    if (item.itemId === itemId) {
      item.quantity = Math.max(1, Number(quantity) || 1)
    }
  }
  setSellerCart(userId, cart)
  return cart
}

export function clearSellerCart(userId) {
  if (!userId) return
  localStorage.removeItem(cartKey(userId))
}
