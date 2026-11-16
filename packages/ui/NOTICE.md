# Source provenance

Button, Input, Label and NativeSelect adapt shadcn/ui's native-prop component
structure and Button's CVA variant factory. Upstream MIT permission is retained
in `LICENSE.shadcn`. The component source has no independent semver release;
the immutable reference is shadcn-ui/ui commit
`6b600cf1ff42f8a746747ea587e52af3ee224643`:

- [Button](https://github.com/shadcn-ui/ui/blob/6b600cf1ff42f8a746747ea587e52af3ee224643/apps/v4/registry/new-york-v4/ui/button.tsx)
- [Input](https://github.com/shadcn-ui/ui/blob/6b600cf1ff42f8a746747ea587e52af3ee224643/apps/v4/registry/new-york-v4/ui/input.tsx)
- [Label](https://github.com/shadcn-ui/ui/blob/6b600cf1ff42f8a746747ea587e52af3ee224643/apps/v4/registry/new-york-v4/ui/label.tsx)
- [NativeSelect](https://github.com/shadcn-ui/ui/blob/6b600cf1ff42f8a746747ea587e52af3ee224643/apps/v4/registry/new-york-v4/ui/native-select.tsx)

Adaptation: retain existing native tags, classes, form defaults, React 19 ref
passthrough and stylesheet cascade. Replace upstream Tailwind styles with
existing original application CSS. Omit Button's polymorphic Slot, Label's Radix
primitive, and NativeSelect's extra wrapper/icon and appearance reset. Retain
select's native numeric `size`. These departures prevent existing DOM and
keyboard behavior from changing; they are not upstream defaults.

`components.json` describes discovery/source ancestry, not a Tailwind installation
or permission to regenerate these adapted components with the registry CLI.

Dependencies verified against npm registry metadata on 2026-10-05:
`@shadcn/lint@0.2.0` (MIT), `class-variance-authority@0.7.1` (Apache-2.0).
CVA is a dependency, not vendored source; its package retains its own license.
Lint documentation/source reference:
`shadcn-ui/lint@ee9391038b5dc025f01777d8dbd0f72d5b885ab4`.
No upstream packages were installed by the source implementation worker.
