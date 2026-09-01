// 전자계약서(Contract-OS) 연동 — 세움os Supabase 의 econtracts 테이블을
// PostgREST REST API 로 읽어, '계약완료(stage=completed) + 계약금>0' 건만 반환한다.
// 서버 컴포넌트에서만 호출한다(키가 클라이언트로 노출되지 않도록).

export type EContractRow = {
  contractNo: string;
  clientName: string; // 건축주
  siteAddress: string; // 현장주소
  contractDate: string; // 계약일자
  productTotal: number; // 제품합계 = 계약 총액 (만원, 부가세 포함)
  supply: number; // 공급가액 (만원, 부가세 제외)
  vat: number; // 부가세 (만원)
  downPayment: number; // 계약금 (만원)
  interim: number; // 중도금 합계 (만원, 중도금1~3)
  balance: number; // 잔금 (만원)
  salesperson: string; // 영업사원
  showroom: string; // 전시장
  permitType: string; // 인허가 종류 코드 (permit/temporary 등)
};

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function isEContractConfigured(): boolean {
  return Boolean(process.env.ECONTRACT_API_URL && process.env.ECONTRACT_API_KEY);
}

// 전시장 이름 정리: 본사/본점/본사전시장 → '본사 전시장' 으로 통합
export function normalizeShowroom(name: unknown): string {
  const s = String(name ?? "").trim();
  if (["본사", "본점", "본사전시장", "본사 전시장"].includes(s)) return "본사 전시장";
  return s;
}

export function permitLabel(code: string): string {
  if (code === "permit") return "인허가";
  if (code === "temporary") return "가설축조";
  return code || "-";
}

export async function fetchCompletedContracts(): Promise<EContractRow[]> {
  const base = process.env.ECONTRACT_API_URL;
  const key = process.env.ECONTRACT_API_KEY;
  if (!base || !key) return [];

  const select = [
    "contract_no",
    "client_name",
    "site_address",
    "contract_date",
    "total_amount",
    "showroom",
    "salesperson",
    "downPayment:data->amounts->>downPayment",
    "supply:data->amounts->>productSupply",
    "vat:data->amounts->>vat",
    "interim1:data->amounts->>interim1",
    "interim2:data->amounts->>interim2",
    "interim3:data->amounts->>interim3",
    "balance:data->amounts->>balance",
    "permitType:data->>permitType",
    "ownerName:data->>ownerName",
  ].join(",");

  const params = new URLSearchParams();
  params.set("select", select);
  params.set("data->>stage", "eq.completed"); // 진행상태 = 계약완료
  params.set("data->>deletedAt", "is.null"); // 삭제 제외
  params.set("order", "contract_no.desc");

  const url = `${base.replace(/\/+$/, "")}/econtracts?${params.toString()}`;

  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`전자계약서 조회 실패 (HTTP ${res.status}) ${body.slice(0, 200)}`);
  }

  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows
    .map((r) => ({
      contractNo: String(r.contract_no ?? ""),
      clientName: String(r.client_name || r.ownerName || ""),
      siteAddress: String(r.site_address ?? ""),
      contractDate: String(r.contract_date ?? ""),
      productTotal: num(r.total_amount),
      // 공급가액: 원본 값 우선, 없으면 제품합계에서 부가세(10%) 역산
      supply: num(r.supply) || Math.round(num(r.total_amount) / 1.1),
      vat: num(r.vat) || (num(r.total_amount) - (num(r.supply) || Math.round(num(r.total_amount) / 1.1))),
      downPayment: num(r.downPayment),
      interim: num(r.interim1) + num(r.interim2) + num(r.interim3),
      balance: num(r.balance),
      salesperson: String(r.salesperson ?? ""),
      showroom: normalizeShowroom(r.showroom),
      permitType: String(r.permitType ?? ""),
    }))
    .filter((r) => r.downPayment > 0);
}
