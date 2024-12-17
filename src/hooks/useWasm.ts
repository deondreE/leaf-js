import { useState } from 'react';

export interface BaseWASMModule { 
    _malloc: Function, 
    HEAPU8: Uint8Array, 
} 

/**
 * useWASM allows you to define the types of a given C++ module inside of the frontend.
 * @param helperOutput Takes in the given module of C++ code, also takes in the function / class arguments, then returns it a one concatonated type.
 * @returns A type subset of the methods you wish to call.
 */
const useWASM = <T>(
    helperOutput: (
        Module?: unknown,
        ...args: unknown[]
    ) => Promise<BaseWASMModule & T>
) => {
    const [methods, setMethods] = useState<(BaseWASMModule & T) |  null>(null);
    
    helperOutput().then((m) => {
        !methods && setMethods(m);
    });

    return methods;
};

export default useWASM;