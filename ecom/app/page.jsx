import Image from "next/image";
import HeroCarousel from "./components/HeroCarousel";
import Categories from "./components/Categories";
import ProductCollection from "./components/ProductCollection";
import SignatureProducts from "./components/SignatureProducts";
import CustomersGrid from "./components/CustomersGrid";
import AISignatureProducts from "./components/AISignatureProducts";

export default function Home() {
  return (
    <section>
      <div className="pt-10 px-4">
        <HeroCarousel/>
      </div>

      <div>
        <Categories/>
      </div>

      <div>
        <ProductCollection/>
      </div>

      <div>
        <AISignatureProducts/>
      </div>

      <div>
        <CustomersGrid/>
      </div>
    </section>
  );
}