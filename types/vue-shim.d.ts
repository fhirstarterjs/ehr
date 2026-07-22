/** Allow importing single-file components as typed Vue modules. */
declare module "*.vue" {
   const component: import("vue").DefineComponent<Record<string, unknown>, unknown, unknown>
   export default component
}
