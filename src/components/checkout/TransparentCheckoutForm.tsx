import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, FileText, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getPaymentMethods, getInstallments, createCardToken, CardNumber, SecurityCode, ExpirationMonth, ExpirationYear } from "@mercadopago/sdk-react";
import { useTheme } from "next-themes";

// Zod schema for form validation - sensitive data removed as it's handled by SDK
const formSchema = z.object({
    cardholderName: z.string().min(3, "Nome muito curto").regex(/^[a-zA-Z\s]+$/, "Apenas letras e espaços"),
    identificationType: z.string().default("CPF"),
    identificationNumber: z.string().min(11, "CPF inválido").max(14, "CNPJ inválido"),
    installments: z.string().default("1"),
});

interface TransparentCheckoutFormProps {
    amount: number;
    onPaymentSubmit: (paymentData: any) => Promise<void>;
    loading?: boolean;
}

export const TransparentCheckoutForm = memo(function TransparentCheckoutForm({ amount, onPaymentSubmit, loading = true }: TransparentCheckoutFormProps) {
    const { resolvedTheme } = useTheme();
    const [issuerId, setIssuerId] = useState<string | null>(null);
    const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const getInitialInstallments = useCallback((val: number) => ([
        { value: "1", label: "1 x de R$ " + val.toFixed(2) },
        { value: "2", label: "2 x de R$ " + (val / 2).toFixed(2) },
        { value: "3", label: "3 x de R$ " + (val / 3).toFixed(2) },
    ]), []);

    const [installmentsList, setInstallmentsList] = useState<{ value: string; label: string; }[]>(() => getInitialInstallments(amount));

    // Update installments when amount changes (e.g. coupon applied)
    useEffect(() => {
        setInstallmentsList(getInitialInstallments(amount));
        // Note: If we had a bin, we should ideally re-fetch real installments here.
        // For simplicity, we reset to defaults which is safe.
    }, [amount, getInitialInstallments]);

    // Styling for SDK components to match Shadcn UI
    const customStyle = useMemo(() => {
        const isDarkMode = resolvedTheme === "dark";
        return {
            fontSize: "14px",
            fontFamily: "ui-sans-serif",
            placeholderColor: "hsl(var(--muted-foreground))",
            color: isDarkMode ? "rgb(250, 250, 250)" : "rgb(9, 9, 11)",
        };
    }, [resolvedTheme]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cardholderName: "",
            identificationType: "CPF",
            identificationNumber: "",
            installments: "1",
        },
    });

    const handleBinChange = useCallback(async (arg: any) => {
        try {
            const bin = typeof arg === 'object' && arg.bin ? arg.bin : arg;
            if (!bin || bin.length <= 6) return; // Wait for at least 6 digits (standard bin)

            // First fetch payment methods
            const responseMethods = await getPaymentMethods({ bin });

            if (responseMethods && responseMethods.results && responseMethods.results.length > 0) {
                const method = responseMethods.results[0];
                const newPaymentMethodId = method.id;
                const newIssuerId = String(method.issuer.id);


                // Update all state at once (React 18 will batch these automatically in async handlers too, but this logic flow is cleaner)
                setPaymentMethodId(newPaymentMethodId);
                setIssuerId(newIssuerId);

                try{
                    // Then fetch installments immediately using the data we just got
                    const responseInstallments = await getInstallments({
                        amount: String(amount),
                        bin,
                        paymentTypeId: 'credit_card'
                    });
                    
                    if (responseInstallments && responseInstallments.length > 0) {
                            const payerCosts = responseInstallments[0].payer_costs;
                            setInstallmentsList(payerCosts.map((cost: any) => ({
                                value: String(cost.installments),
                                label: cost.recommended_message || `${cost.installments}x R$ ${cost.installment_amount}`
                            })));
                    }
                } catch (error) {
                    setInstallmentsList(getInitialInstallments(amount));
                }
            }
        } catch (error) {
            console.error("Error fetching payment info:", error);
        }
    }, [amount]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!paymentMethodId) {
            toast.error("Método de pagamento não identificado. Verifique o número do cartão.");
            return;
        }

        setProcessing(true);

        try {
            console.log("[TransparentCheckout] Starting payment process...");
            console.log("[TransparentCheckout] Creating card token...");

            // createCardToken now reads from the mounted Secure Fields
            const cardToken = await createCardToken({
                cardholderName: values.cardholderName,
                identificationType: values.identificationType,
                identificationNumber: values.identificationNumber,
            });

            if (!cardToken) {
                 throw new Error("Card token creation failed");
            }

            const paymentData = {
                paymentType: "credit_card",
                formData: {
                    token: cardToken.id,
                    issuer_id: issuerId || undefined,
                    payment_method_id: paymentMethodId,
                    transaction_amount: amount,
                    installments: Number(values.installments),
                    description: "Assinatura Corre Legal",
                    payer: {
                        identification: {
                            type: values.identificationType,
                            number: values.identificationNumber,
                        },
                    },
                }
            };

            console.log("[TransparentCheckout] Submitting payment data to parent...");
            setProcessing(false);
            await onPaymentSubmit(paymentData);
            console.log("[TransparentCheckout] Payment submitted successfully.");

        } catch (error) {
            console.error("[TransparentCheckout] Error processing payment:", error);
            toast.error("Erro ao processar pagamento. Verifique os dados do cartão.");
        } finally {
            console.log("[TransparentCheckout] Finished processing.");
            setProcessing(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
                <div className="grid gap-4">
                    {/* Card Number */}
                    <FormItem>
                         <FormLabel>Número do Cartão</FormLabel>
                         <FormControl>
                             <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                <CardNumber 
                                    placeholder="0000 0000 0000 0000"
                                    style={customStyle}
                                    onBinChange={handleBinChange}
                                />
                             </div>
                         </FormControl>
                         <FormMessage />
                    </FormItem>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Expiration Date */}
                        <div className="flex gap-2">
                             <FormItem className="flex-1">
                                <FormLabel>Mês</FormLabel>
                                <FormControl>
                                    <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                        <ExpirationMonth 
                                            placeholder="MM"
                                            style={customStyle}
                                        />
                                    </div>
                                </FormControl>
                             </FormItem>
                             
                             <FormItem className="flex-1">
                                <FormLabel>Ano</FormLabel>
                                <FormControl>
                                    <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                        <ExpirationYear 
                                            placeholder="YY"
                                            mode="short"
                                            style={customStyle}
                                        />
                                    </div>
                                </FormControl>
                             </FormItem>
                        </div>

                        {/* Security Code */}
                        <FormItem>
                            <FormLabel>CVV</FormLabel>
                            <FormControl>
                                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                    <SecurityCode 
                                        placeholder="CVV"
                                        style={customStyle}
                                    />
                                </div>
                            </FormControl>
                        </FormItem>
                    </div>

                     {/* Cardholder Name */}
                    <FormField
                        control={form.control}
                        name="cardholderName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Titular</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input placeholder="Como está no cartão" className="pl-10 uppercase" {...field} />
                                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Identification */}
                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="identificationType"
                            render={({ field }) => (
                                <FormItem className="col-span-1">
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="CPF">CPF</SelectItem>
                                            <SelectItem value="CNPJ">CNPJ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="identificationNumber"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel>Documento</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input placeholder="000.000.000-00" className="pl-10" {...field} />
                                            <FileText className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Installments */}
                    <FormField
                        control={form.control}
                        name="installments"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parcelamento</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={installmentsList.length === 0}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione as parcelas" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {installmentsList.length > 0 ? (
                                            installmentsList.map((installment) => (
                                                <SelectItem key={installment.value} value={installment.value}>
                                                    {installment.label}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="1">1x de R$ {amount.toFixed(2)}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                </div>

                <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading || processing}>
                    {loading || processing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                        </>
                    ) : (
                        `Pagar ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                    )}
                </Button>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Ou pague com
                        </span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-lg font-bold gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
                    onClick={async () => {
                        setProcessing(true);
                        try {
                            await onPaymentSubmit({
                                paymentType: "bank_transfer",
                                formData: null
                            });
                        } catch (error) {
                            console.error("Error initiating PIX payment:", error);
                            setProcessing(false);
                        }
                    }}
                    disabled={loading || processing}
                >
                    <QrCode className="w-5 h-5" />
                    Pagar com PIX
                </Button>
            </form>
        </Form>
    );
});
