import { toast } from "sonner";

export function reorderItems(order: any, add: any) {

    order.items.forEach((item: any) => {
        try {
            
            add({
                productId: item.product._id ?? item.product.id ?? item.product,
                variantId: item.variantId,
                name: item.name,
                brand: item.brand,
                image: item.image,
                quantity: item.quantity,
                priceAtAdd: item.priceAtAdd ?? item.price,
                size: item.size,
                color: item.color,
            });

             toast.success("Items added to cart.");
        } catch (e) {
            toast.error("Failed to add items to cart.");
        }
    
    });
}