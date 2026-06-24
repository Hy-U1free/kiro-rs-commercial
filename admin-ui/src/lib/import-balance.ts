export interface ImportBalanceResponse {
  currentUsage: number
  usageLimit: number
}

export type ImportBalanceDisplay =
  | { usage: string; balanceError?: never }
  | { usage?: never; balanceError: string }

export async function getImportBalanceDisplay(
  credentialId: number,
  getBalance: (id: number) => Promise<ImportBalanceResponse>,
  getErrorMessage: (error: unknown) => string
): Promise<ImportBalanceDisplay> {
  try {
    const balance = await getBalance(credentialId)
    return { usage: `${balance.currentUsage}/${balance.usageLimit}` }
  } catch (error) {
    return { balanceError: getErrorMessage(error) }
  }
}
