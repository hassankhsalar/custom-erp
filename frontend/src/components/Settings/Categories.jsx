import MasterDataPage from "./MasterDataPage";
import { API_ROUTES } from "../../config";

export default function Categories() {
  return (
    <MasterDataPage
      title="Categories"
      endpoint={API_ROUTES.MASTER_DATA_PRODUCT_CATEGORIES}
      readPermission="product_category_read"
      createPermission="product_category_create"
      editPermission="product_category_edit"
      deletePermission="product_category_delete"
    />
  );
}
