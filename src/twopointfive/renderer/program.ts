class Program {
  uniform: Record<string, WebGLUniformLocation | null>;
  attribute: Record<string, number>;
  program: WebGLProgram;

  constructor(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
    this.uniform = {};
    this.attribute = {};
    const vsh = this.compile(gl, vertexSource, gl.VERTEX_SHADER);
    const fsh = this.compile(gl, fragmentSource, gl.FRAGMENT_SHADER);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vsh!);
    gl.attachShader(this.program, fsh!);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(this.program));
    }
    gl.useProgram(this.program);

    const attrCollect: Record<string, number> = {};
    this._collect(vertexSource, 'attribute', attrCollect);
    for (const a in attrCollect) {
      this.attribute[a] = gl.getAttribLocation(this.program, a);
    }

    const uniCollect: Record<string, number> = {};
    this._collect(vertexSource, 'uniform', uniCollect);
    this._collect(fragmentSource, 'uniform', uniCollect);
    for (const u in uniCollect) {
      this.uniform[u] = gl.getUniformLocation(this.program, u);
    }
  }

  compile(gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  _collect(source: string, prefix: string, collection: Record<string, number>): void {
    const r = new RegExp('\\b' + prefix + ' \\w+ (\\w+)', 'ig');
    source.replace(r, (match: string, name: string): string => {
      collection[name] = 0;
      return match;
    });
  }
}

export default Program;
