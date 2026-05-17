import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";

export class UpdateProductNoteUsecase {
  constructor(private readonly productRepository: ProductRepositoryPort) {}

  async execute(productId: string, note: string | null): Promise<void> {
    await this.productRepository.updateProductNote(productId, note);
  }
}
