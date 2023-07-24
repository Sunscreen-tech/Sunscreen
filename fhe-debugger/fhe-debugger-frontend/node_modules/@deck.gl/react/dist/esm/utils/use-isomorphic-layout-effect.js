import { useEffect, useLayoutEffect } from 'react';
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
export default useIsomorphicLayoutEffect;
//# sourceMappingURL=use-isomorphic-layout-effect.js.map