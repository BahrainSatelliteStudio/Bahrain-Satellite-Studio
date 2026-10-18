import {queryOptions} from '@tanstack/react-query';
import {readWorkspace} from './workflow.functions';
export const workspaceQuery=()=>queryOptions({queryKey:['order-workspace'],queryFn:()=>readWorkspace()});
