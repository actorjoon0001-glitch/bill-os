// 전자계약서(Contract-OS) 연동 — 세움os Supabase 의 econtracts 테이블을
// PostgREST REST API 로 읽어, '계약완료(stage=completed) + 계약금>0' 건만 반환한다.
// 서버 컴포넌트에서만 호출한다(키가 클라이언트로 노출되지 않도록).

export type EContractRow = {
  id: number; // 전자계약서(Contract-OS) 원본 id
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
  phone: string; // 연락처 (건축주)
  pyeong: string; // 계약평수 (품목에서 산출, 예: '19평 포치6평')
  moveType: string; // 현장/이동 구분
  items: { name: string; unit: string; area: string; amount: string }[]; // 주문내용(상세용)
  extraCosts: { name: string; amount: string }[]; // 기타 비용
  extraNotes: string; // 서비스·기타 내용
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

// 품목(items)에서 계약평수 문자열 산출 (예: '19평 포치6평 데크4평')
function derivePyeong(items: unknown): string {
  if (!Array.isArray(items)) return "";
  const areaOf = (kw: string) => {
    const it = items.find(
      (x: any) =>
        typeof x?.name === "string" && x.name.includes(kw) && String(x.area ?? "").trim() !== ""
    );
    return it ? String((it as any).area).trim() : "";
  };
  const main =
    areaOf("건물건축비") || areaOf("기초공사") || areaOf("현장 시공") || areaOf("습식난방");
  const porch = areaOf("포치");
  const deck = areaOf("데크");
  const sun = areaOf("썬룸");
  let s = main ? `${main}평` : "";
  if (porch) s += ` 포치${porch}평`;
  if (deck) s += ` 데크${deck}평`;
  if (sun) s += ` 썬룸${sun}평`;
  return s.trim();
}

// 품목에서 현장/이동 구분 산출
function deriveMoveType(items: unknown): string {
  if (!Array.isArray(items)) return "";
  const hasVal = (kw: string) =>
    items.some(
      (x: any) =>
        typeof x?.name === "string" &&
        x.name.includes(kw) &&
        parseFloat(String(x.amount ?? "").replace(/,/g, "")) > 0
    );
  if (hasVal("이동")) return "이동";
  if (hasVal("현장")) return "현장";
  return "";
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
    "id",
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
    "phone:data->client->>phone",
    "items:data->items",
    "extraCosts:data->extraCosts",
    "extraNotes:data->>extraNotes",
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
      id: Number(r.id) || 0,
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
      phone: String(r.phone ?? ""),
      pyeong: derivePyeong(r.items),
      moveType: deriveMoveType(r.items),
      items: Array.isArray(r.items)
        ? (r.items as any[])
            .filter((x) => x?.name)
            .map((x) => ({
              name: String(x.name ?? ""),
              unit: String(x.unit ?? ""),
              area: String(x.area ?? ""),
              amount: String(x.amount ?? ""),
            }))
        : [],
      extraCosts: Array.isArray(r.extraCosts)
        ? (r.extraCosts as any[])
            .filter((x) => x?.name)
            .map((x) => ({ name: String(x.name ?? ""), amount: String(x.amount ?? "") }))
        : [],
      extraNotes: String(r.extraNotes ?? ""),
    }))
    .filter((r) => r.downPayment > 0);
}
