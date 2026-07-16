import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 초기 데모 데이터: 정산팀이 바로 감을 잡을 수 있도록 계약/수납/비용을 샘플로 넣는다.
async function main() {
  console.log("🌱 기존 데이터 초기화...");
  await prisma.expense.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.contract.deleteMany();

  const y = 2026;

  // ── 계약 1: 전자계약, 일부 수납 ─────────────────────────────
  const c1 = await prisma.contract.create({
    data: {
      contractNo: "C-2026-0001",
      title: "세움 ERP 구축 용역",
      clientName: "(주)한빛물산",
      clientBizNo: "123-45-67890",
      source: "ELECTRONIC",
      taxType: "TAXABLE",
      status: "ACTIVE",
      totalAmount: 66_000_000, // 부가세 포함
      contractDate: new Date(`${y}-01-15`),
      memo: "3단계 분할, 전자계약 체결 완료",
      installments: {
        create: [
          { kind: "DOWN_PAYMENT", label: "계약금", seq: 1, plannedAmount: 13_200_000, dueDate: new Date(`${y}-01-20`), received: true, receivedAmount: 13_200_000, receivedDate: new Date(`${y}-01-20`) },
          { kind: "INTERIM", label: "중도금 1차", seq: 1, plannedAmount: 26_400_000, dueDate: new Date(`${y}-04-20`), received: true, receivedAmount: 26_400_000, receivedDate: new Date(`${y}-04-22`) },
          { kind: "BALANCE", label: "잔금", seq: 1, plannedAmount: 26_400_000, dueDate: new Date(`${y}-07-31`), received: false, receivedAmount: 0 },
        ],
      },
    },
  });

  // ── 계약 2: 수기계약, 계약금만 수납 ─────────────────────────
  const c2 = await prisma.contract.create({
    data: {
      contractNo: "C-2026-0002",
      title: "물류창고 인테리어 공사",
      clientName: "대성건설(주)",
      clientBizNo: "220-88-11223",
      source: "MANUAL",
      taxType: "TAXABLE",
      status: "ACTIVE",
      totalAmount: 110_000_000,
      contractDate: new Date(`${y}-06-05`),
      documentName: "대성건설_공사계약서_수기.pdf",
      documentPath: null,
      memo: "수기 계약서 스캔본 보관",
      installments: {
        create: [
          { kind: "DOWN_PAYMENT", label: "계약금", seq: 1, plannedAmount: 11_000_000, dueDate: new Date(`${y}-06-10`), received: true, receivedAmount: 11_000_000, receivedDate: new Date(`${y}-06-11`) },
          { kind: "INTERIM", label: "중도금 1차", seq: 1, plannedAmount: 44_000_000, dueDate: new Date(`${y}-07-15`), received: false, receivedAmount: 0 },
          { kind: "INTERIM", label: "중도금 2차", seq: 2, plannedAmount: 33_000_000, dueDate: new Date(`${y}-08-15`), received: false, receivedAmount: 0 },
          { kind: "BALANCE", label: "잔금", seq: 1, plannedAmount: 22_000_000, dueDate: new Date(`${y}-09-30`), received: false, receivedAmount: 0 },
        ],
      },
    },
  });

  // ── 계약 3: 전자계약, 완납 ─────────────────────────────────
  await prisma.contract.create({
    data: {
      contractNo: "C-2026-0003",
      title: "브랜드 웹사이트 리뉴얼",
      clientName: "코스모컴퍼니",
      clientBizNo: "312-77-90011",
      source: "ELECTRONIC",
      taxType: "TAXABLE",
      status: "COMPLETED",
      totalAmount: 22_000_000,
      contractDate: new Date(`${y}-05-02`),
      installments: {
        create: [
          { kind: "DOWN_PAYMENT", label: "계약금", seq: 1, plannedAmount: 11_000_000, dueDate: new Date(`${y}-05-06`), received: true, receivedAmount: 11_000_000, receivedDate: new Date(`${y}-05-06`) },
          { kind: "BALANCE", label: "잔금", seq: 1, plannedAmount: 11_000_000, dueDate: new Date(`${y}-07-10`), received: true, receivedAmount: 11_000_000, receivedDate: new Date(`${y}-07-09`) },
        ],
      },
    },
  });

  // ── 계약 4: 면세 용역 ─────────────────────────────────────
  await prisma.contract.create({
    data: {
      contractNo: "C-2026-0004",
      title: "임직원 교육 프로그램(면세)",
      clientName: "미래에듀",
      source: "ELECTRONIC",
      taxType: "EXEMPT",
      status: "ACTIVE",
      totalAmount: 8_000_000,
      contractDate: new Date(`${y}-07-01`),
      installments: {
        create: [
          { kind: "DOWN_PAYMENT", label: "계약금", seq: 1, plannedAmount: 4_000_000, dueDate: new Date(`${y}-07-03`), received: true, receivedAmount: 4_000_000, receivedDate: new Date(`${y}-07-03`) },
          { kind: "BALANCE", label: "잔금", seq: 1, plannedAmount: 4_000_000, dueDate: new Date(`${y}-08-30`), received: false, receivedAmount: 0 },
        ],
      },
    },
  });

  // ── 비용(매입) ─────────────────────────────────────────────
  await prisma.expense.createMany({
    data: [
      { expenseDate: new Date(`${y}-01-25`), category: "외주비", vendor: "프리랜서 김개발", description: "ERP 프론트 외주", amount: 8_800_000, taxType: "TAXABLE", contractId: c1.id },
      { expenseDate: new Date(`${y}-04-30`), category: "클라우드", vendor: "AWS", description: "서버 비용", amount: 1_320_000, taxType: "TAXABLE", contractId: c1.id },
      { expenseDate: new Date(`${y}-06-12`), category: "자재비", vendor: "한샘자재", description: "인테리어 자재", amount: 33_000_000, taxType: "TAXABLE", contractId: c2.id },
      { expenseDate: new Date(`${y}-07-05`), category: "임차료", vendor: "세움빌딩관리", description: "7월 사무실 임차료", amount: 2_200_000, taxType: "TAXABLE" },
      { expenseDate: new Date(`${y}-07-10`), category: "광고선전비", vendor: "네이버", description: "검색광고", amount: 1_650_000, taxType: "TAXABLE" },
      { expenseDate: new Date(`${y}-07-12`), category: "복리후생비", vendor: "이마트", description: "간식/비품(면세품 포함)", amount: 550_000, taxType: "EXEMPT" },
    ],
  });

  const contracts = await prisma.contract.count();
  const installments = await prisma.installment.count();
  const expenses = await prisma.expense.count();
  console.log(`✅ 시드 완료: 계약 ${contracts}건, 납입회차 ${installments}건, 비용 ${expenses}건`);
  void c2;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
