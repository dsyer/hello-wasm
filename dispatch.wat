(module
  (type $0 (func (result i32)))
  (type $1 (func (param i32) (result i32)))
  (func $0 (type $0) (result i32)
    i32.const 3)
  (func $1 (type $0) (result i32)
    i32.const 2)
  (func $2 (type $0) (result i32)
    i32.const 1)
  (func $3 (type $1) (param $f i32) (result i32)
    (call_indirect (type $0) (local.get $f))
  )
  (table $0 4 4 funcref)
  (memory $0 256 256)
  (export "memory" (memory $0))
  (export "dispatch" (func $3))
  (elem (i32.const 1) func $0 $1 $2)
)