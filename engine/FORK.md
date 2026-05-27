# Understand-Anything Fork Notes

The v2.0 scanner engine is forked from `D:\AI\workspace\understand-anything-upstream`.

Copied upstream areas:

- `understand-anything-plugin/packages/core/src` -> `engine/src/core`
- `understand-anything-plugin/skills/understand/*.mjs|*.py` -> `engine/upstream-tools`
- `tests/skill/understand` -> `engine/tests/upstream-skill`
- root `LICENSE` -> `engine/LICENSE-understand-anything`

Intentional exclusions from the v2.0 engine surface:

- tour generation
- language lesson generation
- embedding search
- article/chat/dashboard features

v2-specific code is kept outside the copied core under `engine/src/extensions` and `engine/bin`.

