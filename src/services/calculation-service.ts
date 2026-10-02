import { calculateGutter } from '../domain/calculate'
import type { CalculationInput, CalculationResult } from '../domain/types'

export interface CalculationService {
  calculate(input: CalculationInput): Promise<CalculationResult>
}

export const calculationService: CalculationService = {
  async calculate(input) {
    return calculateGutter(input)
  },
}