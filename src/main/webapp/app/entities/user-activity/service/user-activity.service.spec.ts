import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { IUserActivity } from '../user-activity.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../user-activity.test-samples';

import { UserActivityService } from './user-activity.service';

const requireRestSample: IUserActivity = {
  ...sampleWithRequiredData,
};

describe('UserActivity Service', () => {
  let service: UserActivityService;
  let httpMock: HttpTestingController;
  let expectedResult: IUserActivity | IUserActivity[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    expectedResult = null;
    service = TestBed.inject(UserActivityService);
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

    it('should create a UserActivity', () => {
      const userActivity = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(userActivity).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a UserActivity', () => {
      const userActivity = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(userActivity).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a UserActivity', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of UserActivity', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a UserActivity', () => {
      const expected = true;

      service.delete(123).subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    describe('addUserActivityToCollectionIfMissing', () => {
      it('should add a UserActivity to an empty array', () => {
        const userActivity: IUserActivity = sampleWithRequiredData;
        expectedResult = service.addUserActivityToCollectionIfMissing([], userActivity);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(userActivity);
      });

      it('should not add a UserActivity to an array that contains it', () => {
        const userActivity: IUserActivity = sampleWithRequiredData;
        const userActivityCollection: IUserActivity[] = [
          {
            ...userActivity,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addUserActivityToCollectionIfMissing(userActivityCollection, userActivity);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a UserActivity to an array that doesn't contain it", () => {
        const userActivity: IUserActivity = sampleWithRequiredData;
        const userActivityCollection: IUserActivity[] = [sampleWithPartialData];
        expectedResult = service.addUserActivityToCollectionIfMissing(userActivityCollection, userActivity);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(userActivity);
      });

      it('should add only unique UserActivity to an array', () => {
        const userActivityArray: IUserActivity[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const userActivityCollection: IUserActivity[] = [sampleWithRequiredData];
        expectedResult = service.addUserActivityToCollectionIfMissing(userActivityCollection, ...userActivityArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const userActivity: IUserActivity = sampleWithRequiredData;
        const userActivity2: IUserActivity = sampleWithPartialData;
        expectedResult = service.addUserActivityToCollectionIfMissing([], userActivity, userActivity2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(userActivity);
        expect(expectedResult).toContain(userActivity2);
      });

      it('should accept null and undefined values', () => {
        const userActivity: IUserActivity = sampleWithRequiredData;
        expectedResult = service.addUserActivityToCollectionIfMissing([], null, userActivity, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(userActivity);
      });

      it('should return initial array if no UserActivity is added', () => {
        const userActivityCollection: IUserActivity[] = [sampleWithRequiredData];
        expectedResult = service.addUserActivityToCollectionIfMissing(userActivityCollection, undefined, null);
        expect(expectedResult).toEqual(userActivityCollection);
      });
    });

    describe('compareUserActivity', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareUserActivity(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 123 };
        const entity2 = null;

        const compareResult1 = service.compareUserActivity(entity1, entity2);
        const compareResult2 = service.compareUserActivity(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 123 };
        const entity2 = { id: 456 };

        const compareResult1 = service.compareUserActivity(entity1, entity2);
        const compareResult2 = service.compareUserActivity(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 123 };
        const entity2 = { id: 123 };

        const compareResult1 = service.compareUserActivity(entity1, entity2);
        const compareResult2 = service.compareUserActivity(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
