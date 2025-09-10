import { Column } from 'typeorm'
import { ColumnCommonOptions } from 'typeorm/decorator/options/ColumnCommonOptions'
import { ColumnNumericOptions } from 'typeorm/decorator/options/ColumnNumericOptions'
import { ColumnWithWidthOptions } from 'typeorm/decorator/options/ColumnWithWidthOptions'

export function BigintToNumberColumn(options: ColumnCommonOptions & ColumnWithWidthOptions = {}) {
  options.transformer = {
    // findOne 함수에서 FindOperator가 넘어오는데 그때는 그냥 리턴해 줘야 쿼리문이 제대로 생성된다.
    to: (value) => {
      return value
      //return value.toString()
    },
    from: (value) => {
      return Number(value)
    },
  }

  return Column('bigint', options)
}

export function DecimalToNumberColumn(precision, scale, options: ColumnCommonOptions & ColumnNumericOptions = {}) {
  options.transformer = {
    to: (value) => {
      return value
      //return value.toString()
    },
    from: (value) => {
      return Number(value)
    },
  }

  return Column('decimal', { ...options, precision, scale })
}
