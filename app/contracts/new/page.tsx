import { PageHeader } from "@/components/ui";
import NewContractForm from "./NewContractForm";

export default function NewContractPage() {
  return (
    <div>
      <PageHeader
        title="계약 등록"
        desc="수기 또는 전자 계약서를 등록하고, 계약금·중도금·잔금 회차를 구성합니다."
      />
      <NewContractForm />
    </div>
  );
}
