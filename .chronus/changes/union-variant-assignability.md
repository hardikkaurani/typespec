---
changeKind: fix
packages:
  - "@typespec/compiler"
---

Fix type relation checking for union variants so values can be assigned to union variants in type relations and `const` declarations.
