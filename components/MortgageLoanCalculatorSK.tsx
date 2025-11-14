"use client";

import React, { useMemo, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";

const LIMITS = {
  hypo: {
    amount: { min: 5000, max: 600000, step: 1000 },
    years: { min: 1, max: 40, step: 1 },
  },
  nehypo: {
    amount: { min: 500, max: 40000, step: 100 },
    years: { min: 1, max: 8, step: 1 },
  },
} as const;

const DEMO_BANKS = {
  hypo: [
    { id: "slsp", name: "Slovenská sporiteľňa", rate: 3.69 },
    { id: "vub", name: "VÚB", rate: 3.89 },
    { id: "tatrabanka", name: "Tatra banka", rate: 3.19 },
    { id: "csob", name: "ČSOB", rate: 3.5 },
    { id: "unicredit", name: "UniCredit Bank", rate: 3.49 },
    { id: "365", name: "365.bank", rate: 3.35 },
    { id: "mbank", name: "mBank", rate: 3.9 },
    { id: "prima", name: "Prima banka", rate: 3.4 },
  ],
  nehypo: [
    { id: "slsp_nh", name: "Slovenská sporiteľňa", rate: 6.49 },
    { id: "vub_nh", name: "VÚB", rate: 6.3 },
    { id: "tb_nh", name: "Tatra banka", rate: 7.5 },
    { id: "csob_nh", name: "ČSOB", rate: 7.9 },
    { id: "unicredit_nh", name: "UniCredit Bank", rate: 5.99 },
    { id: "365_nh", name: "365.bank", rate: 6.0 },
    { id: "mbank_nh", name: "mBank", rate: 5.89 },
    { id: "prima_nh", name: "Prima banka", rate: 9.5 },
  ],
};

const ASSETS = [
  { id: "sp500", name: "S&P 500 (TR)", cagr: 10 },
  { id: "apple", name: "Apple", cagr: 24 },
  { id: "microsoft", name: "Microsoft", cagr: 23 },
  { id: "nvidia", name: "NVIDIA", cagr: 55 },
  { id: "alphabet", name: "Alphabet (Google)", cagr: 18 },
  { id: "amazon", name: "Amazon", cagr: 20 },
  { id: "meta", name: "Meta (Facebook)", cagr: 17 },
  { id: "tsmc", name: "TSMC", cagr: 19 },
  { id: "berkshire", name: "Berkshire Hathaway", cagr: 11 },
  { id: "tesla", name: "Tesla", cagr: 35 },
  { id: "saudi", name: "Saudi Aramco", cagr: 5 },
] as const;

// Funckie
function pctToMonthly(pct: number) {
  const r = (Number(pct) || 0) / 100;
  return r / 12;
}

function annuityPayment(P: number, nominalAnnualPct: number, months: number) {
  const i = pctToMonthly(nominalAnnualPct);
  if (months <= 0 || P <= 0) return 0;
  if (i === 0) return P / months;
  return (P * i) / (1 - Math.pow(1 + i, -months));
}

function realMonthlyRate(nominalAnnualPct: number, inflationAnnualPct: number) {
  const iN = pctToMonthly(nominalAnnualPct);
  const iF = pctToMonthly(inflationAnnualPct);
  return (1 + iN) / (1 + iF) - 1;
}

function presentValueOfAnnuity(payment: number, r: number, n: number) {
  if (n <= 0) return 0;
  if (Math.abs(r) < 1e-12) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

function fmtMoney(x: number) {
  if (!isFinite(x)) return "–";
  return x.toLocaleString("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

function fmtPct(x: number) {
  return `${(Number(x) || 0).toLocaleString("sk-SK", {
    maximumFractionDigits: 2,
  })}%`;
}

function fvLumpSum(P: number, annualPct: number, years: number) {
  return P * Math.pow(1 + (annualPct || 0) / 100, years);
}

// ** Opravené: definícia CalculatorCard **
type CalculatorCardProps = {
  title: string;
  amount: number;
  setAmount: (v: number) => void;
  amountLimit: typeof LIMITS.hypo.amount;
  years: number;
  setYears: (v: number) => void;
  yearsLimit: typeof LIMITS.hypo.years;
  inflationPct: number;
  setInflationPct: (v: number) => void;
  bankList: typeof DEMO_BANKS.hypo;
  selectedBank: string;
  setSelectedBank: (v: string) => void;
  customRate: number;
  setCustomRate: (v: number) => void;
  useCustomRate: boolean;
  setUseCustomRate: (v: boolean) => void;
  monthly: number;
  totalPaid: number;
  totalInterest: number;
  rRealMonthly: number;
  pvOfPayments: number;
  realOverpayment: number;
  onBankRateChange: (id: string, val: string) => void;
  onSelectBank: (id: string) => void;
};

function CalculatorCard(props: CalculatorCardProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div>Sem môžeš doplniť vstupy pre amount, years, banky, atď.</div>
      </CardContent>
    </Card>
  );
}

// ** Hlavná komponenta **
export default function MortgageLoanCalculatorSK() {
  const [tab, setTab] = useState<"hypo" | "nehypo">("hypo");
  const [banks, setBanks] = useState(DEMO_BANKS);

  const [amount, setAmount] = useState(180000);
  const [years, setYears] = useState(30);
  const [inflationPct, setInflationPct] = useState(2.5);
  const [selectedBank, setSelectedBank] = useState("");
  const [customRate, setCustomRate] = useState(3.5);
  const [useCustomRate, setUseCustomRate] = useState(true);

  const [assetId, setAssetId] = useState<typeof ASSETS[number]["id"]>("sp500");
  const defaultAsset = ASSETS.find((a) => a.id === assetId)!;
  const [assetReturnPct, setAssetReturnPct] = useState<number>(defaultAsset.cagr);

  React.useEffect(() => {
    setAssetReturnPct(ASSETS.find((a) => a.id === assetId)?.cagr ?? 8);
  }, [assetId]);

  const A_LIMIT = LIMITS[tab].amount;
  const Y_LIMIT = LIMITS[tab].years;

  const validatedAmount = Math.min(Math.max(amount, A_LIMIT.min), A_LIMIT.max);
  const validatedYears = Math.min(Math.max(years, Y_LIMIT.min), Y_LIMIT.max);

  const months = useMemo(
    () => Math.max(1, Math.round((Number(validatedYears) || 0) * 12)),
    [validatedYears]
  );

  const bankList = banks[tab];
  const selectedBankObj = bankList.find((b) => b.id === selectedBank);

  const onSelectBank = (val: string) => {
    setSelectedBank(val);
    const r = bankList.find((b) => b.id === val)?.rate as number | undefined;
    if (typeof r === "number" && !isNaN(r)) {
      setUseCustomRate(false);
      setCustomRate(r);
    }
  };

  const effectiveRate = useCustomRate ? Number(customRate) || 0 : Number(selectedBankObj?.rate) || 0;

  const monthly = useMemo(
    () => annuityPayment(Number(validatedAmount) || 0, effectiveRate, months),
    [validatedAmount, effectiveRate, months]
  );

  const totalPaid = useMemo(() => monthly * months, [monthly, months]);
  const totalInterest = useMemo(() => totalPaid - Number(validatedAmount), [totalPaid, validatedAmount]);

  const rRealMonthly = useMemo(() => realMonthlyRate(effectiveRate, Number(inflationPct) || 0), [effectiveRate, inflationPct]);

  const pvOfPayments = useMemo(
    () => presentValueOfAnnuity(monthly, rRealMonthly, months),
    [monthly, rRealMonthly, months]
  );

  const realOverpayment = useMemo(() => pvOfPayments - Number(validatedAmount), [pvOfPayments, validatedAmount]);

  const handleBankRateChange = (id: string, val: string) => {
    setBanks((prev) => ({
      ...prev,
      [tab]: prev[tab].map((b) => (b.id === id ? { ...b, rate: Number(val) } : b)),
    }));
  };

  const investFV = useMemo(() => fvLumpSum(validatedAmount, assetReturnPct, validatedYears), [validatedAmount, assetReturnPct, validatedYears]);
  const investNet = useMemo(() => investFV - totalPaid, [investFV, totalPaid]);
  const breakEvenCAGR = useMemo(() => {
    if (validatedAmount > 0 && validatedYears > 0) {
      const r = Math.pow(totalPaid / validatedAmount, 1 / validatedYears) - 1;
      return r * 100;
    }
    return 0;
  }, [validatedAmount, validatedYears, totalPaid]);

  return (
    <div className="mx-2 sm:mx-auto max-w-5xl p-3 sm:p-4 md:p-8 space-y-6">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">Kalkulátor hypotéky & úveru (SK)</h1>
        <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground max-w-xs sm:max-w-md">
          <Info className="h-4 w-4 mt-1 hidden sm:block" />
          <span className="whitespace-normal">Vyber banku alebo používaj vlastnú sadzbu. Posuvníky sú rýchlejšie, polia sa pri kliku vyprázdnia.</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value: string) => { if (value === "hypo" || value === "nehypo") setTab(value); }} className="w-full">
        <TabsList className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full mt-4">
          <TabsTrigger value="hypo" className="py-4 px-4 rounded-xl w-full font-semibold min-h-[52px] text-base sm:text-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 data-[state=active]:bg-primary/10 transition">
            Hypotekárny úver
          </TabsTrigger>
          <TabsTrigger value="nehypo" className="py-4 px-4 rounded-xl w-full font-semibold min-h-[52px] text-base sm:text-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 data-[state=active]:bg-primary/10 transition">
            Nehypotekárny (spotrebný) úver
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hypo">
          <CalculatorCard
            title="Hypotekárny úver"
            amount={validatedAmount}
            setAmount={setAmount}
            amountLimit={A_LIMIT}
            years={validatedYears}
            setYears={setYears}
            yearsLimit={Y_LIMIT}
            inflationPct={inflationPct}
            setInflationPct={setInflationPct}
            bankList={banks.hypo}
            selectedBank={selectedBank}
            setSelectedBank={setSelectedBank}
            customRate={customRate}
            setCustomRate={setCustomRate}
            useCustomRate={useCustomRate}
            setUseCustomRate={setUseCustomRate}
            monthly={monthly}
            totalPaid={totalPaid}
            totalInterest={totalInterest}
            rRealMonthly={rRealMonthly}
            pvOfPayments={pvOfPayments}
            realOverpayment={realOverpayment}
            onBankRateChange={handleBankRateChange}
            onSelectBank={onSelectBank}
          />
        </TabsContent>

        <TabsContent value="nehypo">
          <CalculatorCard
            title="Nehypotekárny (spotrebný) úver"
            amount={validatedAmount}
            setAmount={setAmount}
            amountLimit={A_LIMIT}
            years={validatedYears}
            setYears={setYears}
            yearsLimit={Y_LIMIT}
            inflationPct={inflationPct}
            setInflationPct={setInflationPct}
            bankList={banks.nehypo}
            selectedBank={selectedBank}
            setSelectedBank={setSelectedBank}
            customRate={customRate}
            setCustomRate={setCustomRate}
            useCustomRate={useCustomRate}
            setUseCustomRate={setUseCustomRate}
            monthly={monthly}
            totalPaid={totalPaid}
            totalInterest={totalInterest}
            rRealMonthly={rRealMonthly}
            pvOfPayments={pvOfPayments}
            realOverpayment={realOverpayment}
            onBankRateChange={handleBankRateChange}
            onSelectBank={onSelectBank}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// EditableNumber a Stat komponenty ponechané rovnaké ako v pôvodnom kóde
