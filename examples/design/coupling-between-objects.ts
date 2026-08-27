// Threshold lowered to 3 for this example. See ../.oxlintrc.json.
class Foo {
  private aaa: A;
  private bbb: B;
  private ccc: C;
  private ddd: D;

  read() {
    return [this.aaa, this.bbb, this.ccc, this.ddd];
  }
}
