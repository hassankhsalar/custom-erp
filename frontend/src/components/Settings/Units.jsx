import MasterDataPage from "./MasterDataPage";
import { API_ROUTES } from "../../config";

export default function Units() {
  return (
    <MasterDataPage
      title="Units"
      endpoint={API_ROUTES.MASTER_DATA_UNITS}
      readPermission="unit_read"
      createPermission="unit_create"
      editPermission="unit_edit"
      deletePermission="unit_delete"
    />
  );
}
