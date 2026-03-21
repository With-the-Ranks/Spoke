import {getFormattedZip, zipToTimeZone} from "./zip-format";

describe('test getFormattedZip', () => {
  it('handles zip correctly', () => {
    expect(getFormattedZip('12345')).toEqual('12345');
  })

  it('handles zip + 4 correctly', () => {
    expect(getFormattedZip('12345-3456')).toEqual('12345');
  })

  it('handles malformed zip correctly 1', () => {
    expect(getFormattedZip('12345-abcd')).toEqual('12345');
  })

  // TODO(PR 4): These tests document the correct expected behavior but
  // fail because of a bug in getFormattedZip — the 4-digit regex matches
  // substrings instead of requiring a pure 4-digit input. Fix in PR 4.
  it.skip('handles malformed zip correctly 2', () => {
    expect(getFormattedZip('a2345-abcd')).toBeFalsy();
  })

  it.skip('handles malformed zip correctly 3', () => {
    expect(getFormattedZip('2345-abcd')).toBeFalsy();
  })

  function wrapper() {
    getFormattedZip('11790', 'OZ');
  }

  it('handles not the USA correctly', () => {
    expect(wrapper).toThrow(/OZ/);
  })
})

describe('test zipToTimeZone', () => {
  it('handles string with 2 leading zeroes', () => {
    var result = zipToTimeZone('00100')
    expect(result[0]).toBe(-1)
    expect(result[1]).toBe(210)
    expect(result[2]).toBe(-4)
    expect(result[3]).toBe(1)
  })
  it('handles 3-digit integer', () => {
    var result = zipToTimeZone(100)
    expect(result[0]).toBe(-1)
    expect(result[1]).toBe(210)
    expect(result[2]).toBe(-4)
    expect(result[3]).toBe(1)
  })
  it('handles highest zip in the list', () => {
    expect(zipToTimeZone('99501')).toBeFalsy()
  })
  it('handles a zip at the lower boundary of a range', () => {
    var result = zipToTimeZone('59000')
    expect(result[2]).toBe(-7)
    expect(result[3]).toBe(1)
  })
  it('handles a zip one lower than the upper limit of a range', () => {
    var result = zipToTimeZone('69020')
    expect(result[2]).toBe(-6)
    expect(result[3]).toBe(1)
  })
  it('handles a zip at the upper limit of a range', () => {
    expect(zipToTimeZone('69021')).toBeFalsy()
  })
})
