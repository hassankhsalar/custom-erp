import MasterDataPage from "./MasterDataPage";
import { API_ROUTES } from "../../config";

export default function Brands() {
  return (
    <MasterDataPage
      title="Brands"
      endpoint={API_ROUTES.MASTER_DATA_BRANDS}
      readPermission="brand_read"
      createPermission="brand_create"
      editPermission="brand_edit"
      deletePermission="brand_delete"
    />
  );
}
