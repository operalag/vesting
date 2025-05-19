import {UIProvider} from '@ton/blueprint';
import { Address } from '@ton/core';

export const promptAddress = async (prompt: string, provider: UIProvider, fallback?: Address) => {
    let promptFinal = fallback ? prompt.replace(/:$/,'') + `(default:${fallback}):` : prompt
    do {
        let testAddr = (await provider.input(promptFinal)).replace(/^\s+|\s+$/g,'')
        try {
            return testAddr == "" && fallback ? fallback : Address.parse(testAddr)
        }
        catch(e) {
            provider.write(testAddr + " is not valid!\n")
            prompt = "Please try again:"
        }
    } while(true)

};

export const promptAmount = async (prompt: string, provider: UIProvider) => {
    let resAmount: number
    do {
        let inputAmount = await provider.input(prompt)
        resAmount = Number(inputAmount)
        if (isNaN(resAmount)) {
            provider.write("Failed to convert " + inputAmount + " to float number")
        }
        else {
            return resAmount.toFixed(9)
        }
    } while(true)
}