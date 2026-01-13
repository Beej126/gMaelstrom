import React from "react";
import { Assert } from "./assert";

export const createContextBundle = <T,>(defaultValue?: T) => {
  const Ctx = React.createContext<T | undefined>(defaultValue);

  const Provider: React.FC<{ value: T; children: React.ReactNode }> = 
    props => (<Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>);
  
  const useCtx = (): T => Assert.notEmpty(React.useContext(Ctx), "useCtx must be used inside its Provider");

  return { Provider, useCtx };
};