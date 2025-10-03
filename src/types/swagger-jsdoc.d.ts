declare module "swagger-jsdoc" {
  interface Options {
    definition: any;
    apis: string[];
  }
  function swaggerJSDoc(options: Options): any;
  export default swaggerJSDoc;
}
