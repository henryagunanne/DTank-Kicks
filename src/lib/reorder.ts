import { toast } from "sonner";

export function reorderItems(order: any, add: any) {

    order.items.forEach((item: any) => {

        add({
            productId: item.productId ?? item.product,
            variantId: item.variantId,
            name: item.name,
            brand: item.brand,
            image: item.image,
            quantity: item.quantity,
            priceAtAdd: item.priceAtAdd ?? item.price,
            size: item.size,
            color: item.color,
        });

    });

    toast.success("Items added to cart.");
}