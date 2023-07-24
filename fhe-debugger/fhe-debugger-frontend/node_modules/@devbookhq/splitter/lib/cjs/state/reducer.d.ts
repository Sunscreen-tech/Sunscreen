import { Action } from './reducer.actions';
import Pair from '../pair';
export interface State {
    isReady: boolean;
    isDragging: boolean;
    draggingIdx?: number;
    pairs: Pair[];
}
export default function reducer(state: State, action: Action): State;
