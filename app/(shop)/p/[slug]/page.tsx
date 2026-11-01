import { notFound } from 'next/navigation'
import { getProductDetailBySlug, getSimilarProducts, getApprovedReviews } from '@/lib/data/shop'
import { ProductDetailClient } from '@/components/product/product-detail-client'

export const revalidate = 60

export default async function PDPPage({ params }: { params: { slug: string } }) {
  const product = await getProductDetailBySlug(params.slug)
  if (!product) notFound()

  const [similar, reviews] = await Promise.all([
    getSimilarProducts(product.categoryId, product.id, 4),
    getApprovedReviews(product.id, 10),
  ])

  return <ProductDetailClient product={product} similar={similar} reviews={reviews} />
}
