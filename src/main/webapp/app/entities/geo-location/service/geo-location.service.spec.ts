import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { IGeoLocation } from '../geo-location.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../geo-location.test-samples';

import { GeoLocationService } from './geo-location.service';

const requireRestSample: IGeoLocation = {
  ...sampleWithRequiredData,
};

describe('GeoLocation Service', () => {
  let service: GeoLocationService;
  let httpMock: HttpTestingController;
  let expectedResult: IGeoLocation | IGeoLocation[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    expectedResult = null;
    service = TestBed.inject(GeoLocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Service methods', () => {
    it('should find an element', () => {
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.find(123).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should create a GeoLocation', () => {
      const geoLocation = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(geoLocation).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a GeoLocation', () => {
      const geoLocation = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(geoLocation).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a GeoLocation', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of GeoLocation', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a GeoLocation', () => {
      const expected = true;

      service.delete(123).subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    describe('addGeoLocationToCollectionIfMissing', () => {
      it('should add a GeoLocation to an empty array', () => {
        const geoLocation: IGeoLocation = sampleWithRequiredData;
        expectedResult = service.addGeoLocationToCollectionIfMissing([], geoLocation);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(geoLocation);
      });

      it('should not add a GeoLocation to an array that contains it', () => {
        const geoLocation: IGeoLocation = sampleWithRequiredData;
        const geoLocationCollection: IGeoLocation[] = [
          {
            ...geoLocation,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addGeoLocationToCollectionIfMissing(geoLocationCollection, geoLocation);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a GeoLocation to an array that doesn't contain it", () => {
        const geoLocation: IGeoLocation = sampleWithRequiredData;
        const geoLocationCollection: IGeoLocation[] = [sampleWithPartialData];
        expectedResult = service.addGeoLocationToCollectionIfMissing(geoLocationCollection, geoLocation);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(geoLocation);
      });

      it('should add only unique GeoLocation to an array', () => {
        const geoLocationArray: IGeoLocation[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const geoLocationCollection: IGeoLocation[] = [sampleWithRequiredData];
        expectedResult = service.addGeoLocationToCollectionIfMissing(geoLocationCollection, ...geoLocationArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const geoLocation: IGeoLocation = sampleWithRequiredData;
        const geoLocation2: IGeoLocation = sampleWithPartialData;
        expectedResult = service.addGeoLocationToCollectionIfMissing([], geoLocation, geoLocation2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(geoLocation);
        expect(expectedResult).toContain(geoLocation2);
      });

      it('should accept null and undefined values', () => {
        const geoLocation: IGeoLocation = sampleWithRequiredData;
        expectedResult = service.addGeoLocationToCollectionIfMissing([], null, geoLocation, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(geoLocation);
      });

      it('should return initial array if no GeoLocation is added', () => {
        const geoLocationCollection: IGeoLocation[] = [sampleWithRequiredData];
        expectedResult = service.addGeoLocationToCollectionIfMissing(geoLocationCollection, undefined, null);
        expect(expectedResult).toEqual(geoLocationCollection);
      });
    });

    describe('compareGeoLocation', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareGeoLocation(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 123 };
        const entity2 = null;

        const compareResult1 = service.compareGeoLocation(entity1, entity2);
        const compareResult2 = service.compareGeoLocation(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 123 };
        const entity2 = { id: 456 };

        const compareResult1 = service.compareGeoLocation(entity1, entity2);
        const compareResult2 = service.compareGeoLocation(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 123 };
        const entity2 = { id: 123 };

        const compareResult1 = service.compareGeoLocation(entity1, entity2);
        const compareResult2 = service.compareGeoLocation(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
